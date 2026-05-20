import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SLOSettings } from '../../domain/models';
export declare const getSummaryIndices: (esClient: ElasticsearchClient, settings: SLOSettings) => Promise<{
    indices: string[];
}>;
