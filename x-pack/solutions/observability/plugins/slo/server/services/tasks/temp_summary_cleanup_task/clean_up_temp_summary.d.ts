import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
interface AggBucketKey extends AggregationsCompositeAggregateKey {
    spaceId: string;
    id: string;
}
interface AggBucket {
    key: AggBucketKey;
    doc_count: number;
}
export interface AggResults {
    duplicate_ids: {
        after_key: AggBucketKey | undefined;
        buckets: AggBucket[];
    };
}
export declare class CleanUpTempSummary {
    private readonly esClient;
    private readonly logger;
    private readonly abortController;
    constructor(esClient: ElasticsearchClient, logger: Logger, abortController: AbortController);
    execute(): Promise<void>;
    private shouldOpenCircuitBreaker;
    private findDuplicateTemporaryDocuments;
    private deleteDuplicateTemporaryDocuments;
}
export {};
