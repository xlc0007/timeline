import { invoke } from "@tauri-apps/api/core";
import type { ImportReport, Plan, PlanInput } from "./types";

export const api = {
  list: () => invoke<Plan[]>("list_plans"),
  create: (input: PlanInput) => invoke<Plan>("create_plan", { input }),
  update: (id: string, input: PlanInput) =>
    invoke<Plan>("update_plan", { id, input }),
  remove: (id: string) => invoke<void>("delete_plan", { id }),
  setArchived: (id: string, archived: boolean) =>
    invoke<void>("set_archived", { id, archived }),
  exportJson: () => invoke<string>("export_json"),
  importJson: (json: string) => invoke<ImportReport>("import_json", { json }),
};
