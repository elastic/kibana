import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkPurgeRollupParams, BulkPurgeRollupResponse } from '@kbn/slo-schema/src/rest_specs/routes/bulk_purge_rollup';
import type { SLODefinitionRepository } from './slo_definition_repository';
export declare class BulkPurgeRollupData {
    private esClient;
    private repository;
    constructor(esClient: ElasticsearchClient, repository: SLODefinitionRepository);
    execute(params: BulkPurgeRollupParams): Promise<BulkPurgeRollupResponse>;
    private validatePurgePolicy;
    private getTimestamp;
}
