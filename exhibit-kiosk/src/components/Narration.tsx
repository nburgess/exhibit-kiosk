// src/components/Narration.tsx
import { useEffect, useMemo, useRef, useState } from "react";

const LINES_PER_PAGE = 3;
const CHAR_SPEED_MS = 40;       // typing speed per character
const READ_DWELL_MS = 2000;     // pause after each 3-line page before advancing

export default function Narration() {
  const [lines, setLines] = useState<string[]>([]);
  const [pageStart, setPageStart] = useState(0); // index of the first line in the current page
  const [shown, setShown] = useState("");        // currently typed characters for this page
  const [i, setI] = useState(0);                 // char index into current page's text

  const timerRef = useRef<number | null>(null);

  // Load file once
  useEffect(() => {
    fetch("/narration.txt")
      .then((r) => r.text())
      .then((t) => {
        // keep blank lines; normalize newlines
        const arr = t.replace(/\r\n/g, "\n").split("\n");
        setLines(arr);
      })
      .catch((e) => console.error("Failed to load narration.txt", e));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Compute the text for the current 3-line page
  const pageText = useMemo(() => {
    if (lines.length === 0) return "";
    const slice = lines.slice(pageStart, pageStart + LINES_PER_PAGE);
    return slice.join("\n");
  }, [lines, pageStart]);

  // Reset typing state whenever the page changes
  useEffect(() => {
    setShown("");
    setI(0);
  }, [pageText]);

  // Typewriter loop for the current page
  useEffect(() => {
    if (!pageText) return;

    // If finished typing the page, dwell, then advance to next page (or loop)
    if (i >= pageText.length) {
      timerRef.current = window.setTimeout(() => {
        const nextStart = pageStart + LINES_PER_PAGE;
        if (nextStart >= lines.length) {
          // loop to the beginning
          setPageStart(0);
        } else {
          setPageStart(nextStart);
        }
      }, READ_DWELL_MS) as unknown as number;
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }

    // Otherwise, type next character
    timerRef.current = window.setTimeout(() => {
      setShown((prev) => prev + pageText[i]);
      setI((n) => n + 1);
    }, CHAR_SPEED_MS) as unknown as number;

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [i, pageText, pageStart, lines.length]);

  return (
    <div className="w-full rounded-none bg-black/70 backdrop-blur-sm px-6 py-4">
      <p className="mx-auto max-w-7xl whitespace-pre-wrap text-base leading-relaxed text-white/90">
        {shown}
      </p>
    </div>
  );
}
