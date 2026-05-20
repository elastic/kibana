import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
interface Dependencies {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClient;
    logger: Logger;
    abortController: AbortController;
}
interface RunParams {
    searchAfter?: AggregationsCompositeAggregateKey;
    chunkSize?: number;
    maxRuns?: number;
}
interface AbortedRunResult {
    aborted: true;
    completed: false;
    nextState: {
        searchAfter: AggregationsCompositeAggregateKey | undefined;
    };
}
interface CompletedRunResult {
    completed: true;
    aborted: false;
}
type RunResult = AbortedRunResult | CompletedRunResult;
export declare function cleanupOrphanSummaries(params: RunParams, dependencies: Dependencies): Promise<RunResult>;
export {};
