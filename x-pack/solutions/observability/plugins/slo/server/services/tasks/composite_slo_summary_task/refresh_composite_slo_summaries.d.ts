import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PostCompositeSloSummaryRefreshResponse } from '@kbn/slo-schema';
import type { SLORoutesDependencies } from '../../../routes/types';
export declare const COOLDOWN_MS: number;
interface Dependencies {
    taskManager: TaskManagerStartContract;
    logger: Logger;
    config: Pick<SLORoutesDependencies['config'], 'compositeSloSummaryTaskEnabled'>;
}
export declare function refreshCompositeSloSummaries({ taskManager, logger, config, }: Dependencies): Promise<PostCompositeSloSummaryRefreshResponse>;
export {};
