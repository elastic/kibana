import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
interface Dependencies {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    logger: Logger;
    abortController: AbortController;
}
export declare function computeAndPersistCompositeSummaries({ esClient, soClient, logger, abortController, }: Dependencies): Promise<void>;
export {};
