import { Sparkles } from "lucide-react";
import type { Archetype } from "@/lib/archetype";

export function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
        <Sparkles size={11} />
        Developer Archetype
      </div>
      <h2 className="mt-1.5 text-xl font-semibold text-amber-900 dark:text-amber-100">
        {archetype.label}
      </h2>
      <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
        {archetype.blurb}
      </p>
    </div>
  );
}
