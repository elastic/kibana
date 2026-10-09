import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscoveries, Replacements } from '@kbn/elastic-assistant-common';
interface DeduplicateAttackDiscoveriesParams {
    attackDiscoveries: AttackDiscoveries;
    computeSha256Hash: (input: string) => string;
    connectorId: string;
    esClient: ElasticsearchClient;
    /**
     * Optional producer identity. MUST match the value the persistence path
     * contributes to the hash, otherwise the lookup computes ids that were never
     * persisted and every run reports its discoveries as new.
     */
    generationSource?: string;
    indexPattern: string;
    logger: Logger;
    ownerInfo: {
        id: string;
        isSchedule: boolean;
    };
    replacements: Replacements | undefined;
    spaceId: string;
}
export declare const deduplicateAttackDiscoveries: ({ attackDiscoveries, computeSha256Hash, connectorId, esClient, generationSource, indexPattern, logger, ownerInfo, replacements, spaceId, }: DeduplicateAttackDiscoveriesParams) => Promise<AttackDiscoveries>;
export {};
