import { Logger } from "@kbn/logging";
import { ExtractEntityTask } from "./extract_entity_task";
import { ALL_ENTITY_TYPES } from "../domain/definitions/entity_type";
import { TaskManager } from "../types";

export function registerTasks(taskManager: TaskManager, logger: Logger) {
  const tasks = ALL_ENTITY_TYPES.map(type => new ExtractEntityTask(taskManager, logger, type));
  tasks.forEach(task => task.register());
}