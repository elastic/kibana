import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import type { TaskState } from './types';
interface Dependencies {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClient;
    logger: Logger;
    abortController: AbortController;
}
/**
 * At most we will delete MAX_DOCS_PER_DELETE documents in the delete by query (DBQ), using REQUESTS_PER_SECOND deletion per seconds.
 * Given that, we can estimate the maximum duration of the DBQ: 1M/300 = ~3333 seconds = ~55 minutes.
 * The task is scheduled to run every 4hours, so we have enough buffer to let the task complete before the next run.
 * However, in case the DBQ takes longer than expected, we check to see if the previous DBQ is still running.
 * If it is, we skip the current run to avoid overlapping delete tasks. We cancel previous DBQ if it has been running for more than MAX_TASK_DURATION_NANOS.
 */
export declare function cleanupStaleInstances(previousState: TaskState, dependencies: Dependencies): Promise<{
    nextState: TaskState;
}>;
export {};
