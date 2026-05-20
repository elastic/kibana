import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProfilingESClient } from '../../common/profiling_es_client';
export declare function createProfilingEsClient({ esClient, }: {
    esClient: ElasticsearchClient;
}): ProfilingESClient;
