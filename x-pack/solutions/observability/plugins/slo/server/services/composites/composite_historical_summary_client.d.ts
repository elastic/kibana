import type { ElasticsearchClient } from '@kbn/core/server';
import type { FetchCompositeHistoricalSummaryParams, FetchCompositeHistoricalSummaryResponse, FetchHistoricalSummaryParams, FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from '../slo_definition_repository';
export interface HistoricalSummaryProvider {
    fetch(params: FetchHistoricalSummaryParams): Promise<FetchHistoricalSummaryResponse>;
}
export declare class CompositeHistoricalSummaryClient {
    private compositeSloRepository;
    private sloDefinitionRepository;
    private historicalSummaryProvider;
    constructor(esClient: ElasticsearchClient, compositeSloRepository: CompositeSLORepository, sloDefinitionRepository: SLODefinitionRepository, historicalSummaryProvider?: HistoricalSummaryProvider);
    fetch(params: FetchCompositeHistoricalSummaryParams): Promise<FetchCompositeHistoricalSummaryResponse>;
    private fetchMemberHistoricalData;
    private computeWeightedHistorical;
}
