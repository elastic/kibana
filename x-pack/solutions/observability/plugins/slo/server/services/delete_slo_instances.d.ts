import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeleteSLOInstancesParams } from '@kbn/slo-schema';
export declare class DeleteSLOInstances {
    private esClient;
    constructor(esClient: ElasticsearchClient);
    execute(params: DeleteSLOInstancesParams): Promise<void>;
    private deleteRollupData;
    private deleteSummaryData;
}
