import { EntityStoreTaskType } from "./constants";
import { TaskRegisterDefinition } from "@kbn/task-manager-plugin/server";

export interface TaskConfig extends Partial<TaskRegisterDefinition> {
    title: string;
    type: string;
    timeout: string;
    interval: string;
}

export const TasksConfig: Record<EntityStoreTaskType, TaskConfig> = {
    [EntityStoreTaskType.Values.extractEntity]: {
        title: 'Entity Store - Execute Entity Task',
        type: 'entity_store:v2:entity',
        timeout: '25s',
        interval: '30s',
    }
};