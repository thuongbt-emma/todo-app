'use client';
import { useEffect, useRef, useState } from 'react';

/** Colour picker that reports a value once the picker is closed, not on every drag tick. */
export function ColorInput({ value, onCommit, className, ariaLabel }: { value: string; onCommit: (v: string) => void; className?: string; ariaLabel?: string }) {
  const [live, setLive] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const saved = useRef(value);
  const commit = useRef(onCommit);
  useEffect(() => { commit.current = onCommit; });
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setLive(value); }
  useEffect(() => { saved.current = value; }, [value]);
  const flush = (v: string) => {
    if (v === saved.current) return;
    saved.current = v;
    commit.current(v);
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onNativeChange = () => flush(el.value); // native change = picker closed
    el.addEventListener('change', onNativeChange);
    return () => el.removeEventListener('change', onNativeChange);
  }, []);
  return (
    <input
      ref={ref}
      type="color"
      value={live}
      onChange={(e) => setLive(e.target.value)}
      onBlur={(e) => flush(e.target.value)}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
