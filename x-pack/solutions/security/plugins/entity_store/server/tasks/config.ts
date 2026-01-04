import { EntityStoreTaskType } from "./constants";
import { TaskRegisterDefinition } from "@kbn/task-manager-plugin/server";

export interface TaskConfig extends Partial<TaskRegisterDefinition> {
    title: string;
    type: string;
    timeout: string;
}

const config: Record<EntityStoreTaskType, TaskConfig> = {
    [EntityStoreTaskType.Values.entity]: {
        title: 'Entity Store - Execute Entity Task',
        type: 'entity_store:v2:entity',
        timeout: '30m',
    }
};

export default config;