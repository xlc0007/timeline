import type { Category, Plan } from "../lib/types";
import { CATEGORY_MAP } from "../lib/classify";

interface Props {
  plan: Plan;
  left: number;
  width: number;
  top: number;
  height: number;
  color: Category;
  onOpen: () => void;
}

export function PlanBar({ plan, left, width, top, height, color, onOpen }: Props) {
  const meta = CATEGORY_MAP[color];
  return (
    <div
      className={`plan-bar ${plan.archived ? "archived" : ""}`}
      style={{ left, width, top, height, background: meta.color }}
      title={plan.title}
      onClick={onOpen}
    >
      <span className="bar-title">{plan.title}</span>
    </div>
  );
}
