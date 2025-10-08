// mqttEvents.js
import { EventEmitter } from "events";
import mqtt from "mqtt";

const bus = new EventEmitter();

// --- CONFIG ---
const MQTT_URL = "mqtt://localhost:1883";
const MQTT_TOPICS = ["my_mqtt_topic"];
const HUMAN_TYPE = "Human";
const MIN_CONFIDENCE = 0.3;

// Track last 10 obs IDs for which events have been sent
const RECENT_OBS_IDS = [];
const RECENT_OBS_IDS_MAX = 10;

// Connect once
const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("[MQTT] connected");
  MQTT_TOPICS.forEach((t) =>
    client.subscribe(t, (err) =>
      err ? console.error("[MQTT] sub error", err) : console.log("[MQTT] subscribed", t)
    )
  );
});

function getClassInfo(obs) {
  // Some payloads use obs.class, others use obs.classes[]
  if (obs?.class?.type) {
    return { type: obs.class.type, score: obs.class.score ?? obs.class.confidence };
  }
  if (Array.isArray(obs?.classes) && obs.classes.length) {
    // pick the best-scoring Human if present, else best class
    const humans = obs.classes.filter((c) => c.type === HUMAN_TYPE);
    const best = (humans.length ? humans : obs.classes).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    return { type: best?.type, score: best?.score ?? best?.confidence };
  }
  return { type: undefined, score: undefined };
}

function toDataUrlMaybe(b64) {
  if (typeof b64 !== "string" || b64.length < 8) return undefined;
  let s = b64.trim();
  // add padding if needed
  const m = s.length % 4;
  if (m) s += "=".repeat(4 - m);
  // Quick sanity: JPEG base64 typically starts with /9j/
  // Don’t hard-fail if it doesn’t—some firmwares can deliver PNG.
  const mime = s.startsWith("/9j/") ? "image/jpeg" : "image/*";
  return `data:${mime};base64,${s}`;
}

client.on("message", (topic, message) => {
  try {
    const msg = JSON.parse(message.toString());
    const observations = [msg];

    observations.forEach((obs) => {
      const { type, score } = getClassInfo(obs);

      const obsId = obs.track_id ?? obs.id;
      console.log("obsId", obsId);
      if (!obsId) return;
      if (RECENT_OBS_IDS.includes(obsId)) return;
      RECENT_OBS_IDS.push(obsId);
      if (RECENT_OBS_IDS.length > RECENT_OBS_IDS_MAX) RECENT_OBS_IDS.shift();
      
      if (type !== HUMAN_TYPE && type !== 'Face') return;
      if (score != null && score < MIN_CONFIDENCE) return; // optional: confidence gate
      console.log(`[MQTT] ${type} (${(score * 100).toFixed(0)}%)`);
      const ts = msg.frame?.timestamp ?? Date.now();
      const imageUrl = obs?.image?.data ? toDataUrlMaybe(obs.image.data) : undefined;
      const evt = {
        id: `${topic}-${ts}-${obsId ?? Math.random().toString(36).slice(2)}`,
        timestamp: ts,
        title: `Observe ${type}`,
        subtitle: new Date(ts).toLocaleTimeString(),
        meta: {
          topic: "object_recognition",
          trackId: obsId,
          class: { type, score },
          observations: obs?.observations?.length || 1,
          bbox: obs.bounding_box ?? obs.image?.bounding_box, // handle either source
        },
        imageUrl,
      };
      console.log("EMIT", evt);
      bus.emit("axis-event", evt);
    });
  } catch (e) {
    console.error("[MQTT] bad message:", e);
  }
});

export default bus;


// Forward messages as higher-level events
// client.on("message", (topic, message) => {
//   try {
//     const msg = JSON.parse(message.toString());

//     const observations = msg.frame?.observations || [];
//     observations.forEach((obs) => {
//       const evt = {
//         id: `${topic}-${Date.now()}-${obs.track_id}`,
//         timestamp: msg.frame?.timestamp,
//         title: `Detected ${obs.class?.type || "Object"}`,
//         subtitle: new Date(msg.frame?.timestamp).toLocaleTimeString(),
//         meta: {
//           topic,
//           trackId: obs.track_id,
//           class: obs.class,
//           bbox: obs.bounding_box,
//         },
//         imageUrl: obs.image?.data
//           ? `data:image/jpeg;base64,${obs.image.data}`
//           : undefined,
//       };

//       bus.emit("axis-event", evt);
//     });
//   } catch (e) {
//     console.error("Bad message", e);
//   }
// });