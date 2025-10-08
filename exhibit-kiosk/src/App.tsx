import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Card from "./components/Card";
import Narration from "./components/Narration";

import { CONFIG } from "./config";
import type { EventItem } from "./types/event";

/**
 * Exhibit “8-up” Kiosk — React + Tailwind + Framer Motion
 * - Black background, shows up to 8 ID-card tiles (image + text)
 * - Consumes events via SSE (EventSource)
 * - When 8 tiles fill, batch animates: zoom upward and vanish; then clears
 * - On each clear, triggers a light via HTTP POST (configurable)
 *
 * Configure these endpoints to match your environment:
 *  - SSE_URL: server-sent events endpoint that streams { id?, imageUrl, title, subtitle, meta }
 *  - LIGHT_URL: endpoint to signal a light-on event when the batch clears
 *
 * Example SSE event payload (as a single "data:" line):
 *   {"id":"abc-123","imageUrl":"https://…/photo.jpg","title":"Subject Name","subtitle":"2025-09-02 14:33:18","meta":"Camera 4A"}
 */

export default function ExhibitApp() {
  const [visible, setVisible] = useState<EventItem[]>([]);
  const [pending, setPending] = useState<EventItem[]>([]);
  const [status, setStatus] = useState<string>("connecting…");
  const [isClearing, setIsClearing] = useState(false);
  const lightCooldownRef = useRef<number>(0);
  const [total, setTotal] = useState(0);

  // Derived: show an exact 8-slot grid (with blanks when < 8)
  const slots = useMemo(() => {
    const blanks = Array.from({ length: Math.max(0, CONFIG.BATCH_SIZE - visible.length) }).map(
      (_, i) => ({ id: `blank-${i}` })
    );
    return [...visible, ...blanks] as (EventItem | { id: string })[];
  }, [visible]);

  useEffect(() => {
    const es = new EventSource(CONFIG.SSE_URL);
    es.onopen = () => setStatus("Collecting");
    es.onerror = () => setStatus("reconnecting…");

    es.onmessage = async (ev) => {
      try {
        const raw = JSON.parse(ev.data || "{}");
        if (!raw?.imageUrl) return;

        // Preload image to avoid flicker
        const pre = new Image();
        pre.decoding = "async";
        pre.src = raw.imageUrl;
        try { await pre.decode(); } catch {}

        const item: EventItem = {
          id: String(raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          imageUrl: raw.imageUrl,
          title: raw.title,
          subtitle: raw.subtitle,
          meta: raw.meta,
          alt: raw.alt || raw.title || "image",
        };
        setPending((q) => [...q, item]);
      } catch (e) {
        console.error("Bad SSE payload", e);
      }
    };

    return () => es.close();
  }, []);

  // Move items from pending -> visible (until we fill the frame)
  useEffect(() => {
    if (isClearing) return; // hold new arrivals during the clear animation
    if (visible.length >= CONFIG.BATCH_SIZE) return; // already full; wait for clear cycle
    if (pending.length === 0) return;

    const take = Math.min(CONFIG.BATCH_SIZE - visible.length, pending.length);
    if (take > 0) {
      setVisible((v) => [...v, ...pending.slice(0, take)]);
      setPending((q) => q.slice(take));
      setTotal((t) => t + take); // NEW
    }
  }, [pending, visible, isClearing]);

  // When frame fills to 8, trigger the clear cycle
  useEffect(() => {
    if (!isClearing && visible.length === CONFIG.BATCH_SIZE) {
      startClearCycle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, isClearing]);

  const triggerLight = useCallback(async (count: number) => {
    const now = Date.now();
    // minimal cooldown so double-clears don't spam the device if animation retriggers
    if (now - lightCooldownRef.current < 500) return;
    lightCooldownRef.current = now;

    try {
      await fetch(CONFIG.LIGHT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "frame_cleared", count, at: new Date().toISOString() }),
        keepalive: true, // allows fire-and-forget on navigation
      });
    } catch (e) {
      console.warn("Light trigger failed:", e);
    }
  }, []);

  const startClearCycle = useCallback(() => {
    // pause before tiles vanish
    window.setTimeout(() => {
      setIsClearing(true);
      const countAtClear = visible.length; // capture before we clear

      // then run the existing vanish animation + clear
      window.setTimeout(() => {
        setVisible([]);
        setIsClearing(false);
        triggerLight(countAtClear);
      }, CONFIG.CLEAR_ANIM_MS);
    }, CONFIG.PAUSE_BEFORE_CLEAR_MS);
  }, [triggerLight, visible.length]);

  return (
    <div className="min-h-screen w-full bg-black text-white">
      {/* Status HUD */}
      <div className="pointer-events-none fixed right-20 top-1 z-50 rounded-full px-3 py-1 text-[11px] tracking-wide text-white/80">
        {status} · {visible.length}/{CONFIG.BATCH_SIZE} · total {total}
      </div>

      {/* Grid container animates as a group when clearing */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <motion.div
          initial={false}
          animate={isClearing ? { y: -200, scale: 1.08, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: CONFIG.CLEAR_ANIM_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {slots.map((slot) => (
            "imageUrl" in slot ? (
              <Card key={slot.id} item={slot as EventItem} />
            ) : (
              <BlankCard key={slot.id} />
            )
          ))}
        </motion.div>

        {/* Narration box */}
        <div className="fixed inset-x-0 bottom-0 z-40">
          <Narration />
        </div>
      </div>
    </div>
  );
}

function BlankCard() {
  return (
    <div/>
  );
}
