import type { ElasticsearchClient } from '@kbn/core/server';
import type { BatchGetCompositeSLOResponse, GetCompositeSLOResponse } from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
export declare class GetCompositeSLO {
    private compositeSloRepository;
    private sloDefinitionRepository;
    private summaryClient;
    private esClient;
    constructor(compositeSloRepository: CompositeSLORepository, sloDefinitionRepository: SLODefinitionRepository, summaryClient: SummaryClient, esClient: ElasticsearchClient);
    executeBatch(ids: string[], spaceId: string): Promise<BatchGetCompositeSLOResponse>;
    execute(id: string, spaceId: string): Promise<GetCompositeSLOResponse>;
    private loadPersistedSummaries;
    private executeOne;
}
