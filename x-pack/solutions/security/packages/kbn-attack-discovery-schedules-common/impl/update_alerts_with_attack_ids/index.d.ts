import type { ElasticsearchClient } from '@kbn/core/server';
export declare const ALERTS_INDEX_PATTERN = ".alerts-security.alerts-";
export interface UpdateAlertsWithAttackIdsParams {
    alertIdToAttackIdsMap: Record<string, string[]>;
    esClient: ElasticsearchClient;
    spaceId: string;
}
export declare function updateAlertsWithAttackIds({ alertIdToAttackIdsMap, esClient, spaceId, }: UpdateAlertsWithAttackIdsParams): Promise<void>;
