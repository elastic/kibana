import type { FindSLOParams, FindSLOResponse } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { SummarySearchClient } from './summary_search_client/types';
export declare class FindSLO {
    private repository;
    private summarySearchClient;
    constructor(repository: SLODefinitionRepository, summarySearchClient: SummarySearchClient);
    execute(params: FindSLOParams): Promise<FindSLOResponse>;
}
