"use client";

import { STEPS, stepIndex } from "@/lib/steps";
import type { Step } from "@/lib/types";

type Id = Step | "keyword";

/**
 * current: the step being shown. reached: the furthest step the article has unlocked.
 * Completed steps are clickable so users can go back and review.
 */
export function Stepper({
  current,
  reached,
  onSelect,
  locked = false,
}: {
  current: Id;
  reached: Id;
  onSelect?: (id: Id) => void;
  /** True while a step is generating; disables navigation. */
  locked?: boolean;
}) {
  const reachedIdx = stepIndex(reached);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto sm:gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const idx = stepIndex(s.id);
        const complete = idx < reachedIdx;
        const active = s.id === current;
        const clickable = Boolean(onSelect) && !locked && (complete || idx === reachedIdx);
        return (
          <li key={s.id} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelect?.(s.id)}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition ${
                active ? "bg-indigo-600 text-white" : complete ? "text-slate-800 hover:bg-slate-100" : "text-slate-400"
              } disabled:cursor-default`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-white text-indigo-700"
                    : complete
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-300 bg-white text-slate-400"
                }`}
              >
                {complete ? "✓" : s.n}
              </span>
              <span className="whitespace-nowrap font-medium">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-300 sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
