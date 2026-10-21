import type { Step } from "@/lib/types";

export interface StepDef {
  id: Step | "keyword";
  n: number;
  label: string;
  hint: string;
}

/** The whole product is this list. Users always know where they are. */
export const STEPS: StepDef[] = [
  { id: "keyword", n: 1, label: "Keyword", hint: "What should the article rank for?" },
  { id: "research", n: 2, label: "Research", hint: "Google results, questions, sources" },
  { id: "outline", n: 3, label: "Outline", hint: "Review and edit the structure" },
  { id: "draft", n: 4, label: "Draft", hint: "Full article, written live" },
  { id: "seo", n: 5, label: "SEO & export", hint: "Title, description, score, download" },
];

const ORDER: Array<Step | "keyword"> = ["keyword", "research", "outline", "draft", "seo", "done"];

export function stepIndex(step: Step | "keyword"): number {
  return ORDER.indexOf(step);
}

export function nextStep(step: Step): Step {
  const i = ORDER.indexOf(step);
  return (ORDER[Math.min(i + 1, ORDER.length - 1)] as Step) ?? "done";
}

export function stepLabel(step: Step): string {
  if (step === "done") return "Done";
  return STEPS.find((s) => s.id === step)?.label ?? step;
}
