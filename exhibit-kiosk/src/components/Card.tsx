import { useMemo } from "react";
import { motion } from "framer-motion";
import TypeLines from "./TypeLines";
import type { EventItem } from "../types/event";
import { fmt } from "../lib/format";

export default function Card({ item }: { item: EventItem }) {
  // Build the lines to type (title → subtitle → meta)
  const lines = useMemo(() => {
    const arr: string[] = [];
    if (item.title) arr.push(item.title);
    if (item.subtitle) arr.push(item.subtitle);
    if (item.meta) {
      if (typeof item.meta === "string") {
        arr.push(item.meta);
      } else {
        for (const [k, v] of Object.entries(item.meta)) {
          arr.push(`${k}: ${fmt(v)}`);
        }
      }
    }
    return arr;
  }, [item]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden p-3 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden bg-black">
          <motion.img
            src={item.imageUrl}
            alt={item.alt || "image"}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>
        <TypeLines lines={lines} speed={22} lineDelay={140} className="min-w-0 flex-1" />
      </div>
    </motion.div>
  );
}
