import { useEffect, useRef, useState } from "react";

export default function TypeLines({
  lines,
  speed = 24,
  lineDelay = 140,
  className = "",
}: {
  lines: string[];
  speed?: number;
  lineDelay?: number;
  className?: string;
}) {
  const [rendered, setRendered] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const out = Array(lines.length).fill("");
    setRendered(out);

    let cancelled = false;
    let li = 0, ci = 0;

    const tick = () => {
      if (cancelled || li >= lines.length) return;
      const target = lines[li] ?? "";
      if (ci <= target.length) {
        out[li] = target.slice(0, ci);
        setRendered([...out]);
        ci++;
        timerRef.current = window.setTimeout(tick, speed) as unknown as number;
      } else {
        li++; ci = 0;
        timerRef.current = window.setTimeout(tick, lineDelay) as unknown as number;
      }
    };

    timerRef.current = window.setTimeout(tick, speed) as unknown as number;
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [lines, speed, lineDelay]);

  return (
    <div className={className}>
      {rendered.map((txt, idx) => (
        <div
          key={idx}
          className={
            idx === 0
              ? "truncate text-lg font-semibold leading-tight"
              : idx === 1
              ? "truncate text-sm text-white/80"
              : "text-xs text-white/65"
          }
        >
          {txt}
        </div>
      ))}
    </div>
  );
}