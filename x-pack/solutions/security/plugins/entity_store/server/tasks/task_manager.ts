import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { EntityStorePlugins, TaskManager } from '../types';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export async function getTaskManager(core: CoreSetup, setupPlugins: EntityStorePlugins): Promise<TaskManager> {
    const [, startPlugins] = await core.getStartServices();
    const taskManagerStart = (startPlugins as { taskManager: TaskManagerStartContract }).taskManager;
    const taskManagerSetup = setupPlugins.taskManager;
  
    return {
     ...taskManagerSetup,
     ...taskManagerStart,
   };
  }