"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGE = "Welcome to Hexora";
const TYPE_DELAY_MS = 70;
const HOLD_MS = 950;
const FADE_MS = 420;

type Phase = "hidden" | "typing" | "holding" | "fading";

export default function WelcomeTyping() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [typedText, setTypedText] = useState("");
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setTypedText(MESSAGE);
      setPhase("holding");
      const hideTimer = window.setTimeout(() => setPhase("hidden"), HOLD_MS);
      timeoutsRef.current.push(hideTimer);
      return;
    }

    setPhase("typing");
    let index = 0;

    const typeNext = () => {
      index += 1;
      setTypedText(MESSAGE.slice(0, index));

      if (index < MESSAGE.length) {
        const nextTimer = window.setTimeout(typeNext, TYPE_DELAY_MS);
        timeoutsRef.current.push(nextTimer);
        return;
      }

      setPhase("holding");
      const holdTimer = window.setTimeout(() => {
        setPhase("fading");
        const fadeTimer = window.setTimeout(() => setPhase("hidden"), FADE_MS);
        timeoutsRef.current.push(fadeTimer);
      }, HOLD_MS);
      timeoutsRef.current.push(holdTimer);
    };

    const startTimer = window.setTimeout(typeNext, TYPE_DELAY_MS);
    timeoutsRef.current.push(startTimer);

    return () => {
      for (const timer of timeoutsRef.current) {
        window.clearTimeout(timer);
      }
      timeoutsRef.current = [];
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-[color:color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-[2px] transition-opacity duration-300 ${
          phase === "fading" ? "opacity-0" : "opacity-100"
        }`}
      />
      <div
        className={`card relative rounded-2xl px-6 py-5 shadow-[var(--shadow-lift)] transition-all duration-300 md:px-10 md:py-8 ${
          phase === "fading" ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="mono text-center text-2xl tracking-[0.12em] text-[var(--foreground)] md:text-5xl">
          {typedText}
          <span className="ml-0.5 inline-block animate-pulse">|</span>
        </p>
      </div>
    </div>
  );
}
