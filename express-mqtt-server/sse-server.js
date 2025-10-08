
/* -----------------------
   Example Node/Express SSE (server) — minimal
   ----------------------- */

import express from "express";
import cors from "cors";
import bus from "./mqttEvents.js";

const app = express();
app.use(cors());

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const ping = setInterval(() => res.write(":\n\n"), 15000); // keep-alive comment
  req.on("close", () => clearInterval(ping));


  const handler = (evt) => send(evt);
  bus.on("axis-event", handler);

  req.on("close", () => {
    bus.off("axis-event", handler);
  });
});

app.post("/light/on", express.json(), (req, res) => {
  console.log("LIGHT TRIGGER", req.body);
  // Integrate with your light device here (HTTP, MQTT, serial, etc.)
  res.sendStatus(204);
});

app.listen(3000, () => console.log("SSE on :3000/stream"));



  // Demo tick — replace with your camera event pipeline
  // let n = 0;
  // const demo = setInterval(() => {
  //   n++;
  //   send({
  //     id: `demo-${Date.now()}`,
  //     imageUrl: "https://picsum.photos/seed/" + n + "/400/400",
  //     title: `Observee #${n}`,
  //     subtitle: new Date().toLocaleTimeString(),
  //     meta: { camera: "A1", confidence: 0.82, motion: true }
  //   });
  // }, 3000);
  // req.on("close", () => clearInterval(demo));