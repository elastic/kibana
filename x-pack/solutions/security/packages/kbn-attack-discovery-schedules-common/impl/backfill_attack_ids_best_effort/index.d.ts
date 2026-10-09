import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export interface BackfillAttackIdsBestEffortParams {
    alertIdToAttackIdsMap: Record<string, string[]>;
    esClient: ElasticsearchClient;
    logger: Logger;
    spaceId: string;
}
/**
 * Best-effort wrapper around `updateAlertsWithAttackIds`. Both AD 2.0
 * persistence paths (ad-hoc `_validate` and scheduled `workflow_executor`) use
 * this so the back-fill cannot diverge and — critically — so a failure to
 * stamp `${ALERT_ATTACK_IDS}` onto the underlying detection alerts never
 * hard-fails an otherwise-successful generation. On failure the attacks have
 * already been persisted; only the convenience grouping on the Attacks page is
 * affected, so we swallow the error and log a prominent warning instead.
 */
export declare const backfillAttackIdsBestEffort: ({ alertIdToAttackIdsMap, esClient, logger, spaceId, }: BackfillAttackIdsBestEffortParams) => Promise<void>;
