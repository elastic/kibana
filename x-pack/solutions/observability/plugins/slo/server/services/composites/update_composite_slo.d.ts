import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdateCompositeSLOInput, UpdateCompositeSLOResponse } from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
export interface UpdateCompositeSloParams extends UpdateCompositeSLOInput {
    id: string;
    spaceId: string;
    userId: string | undefined;
}
export interface UpdateCompositeSloDeps {
    esClient: ElasticsearchClient;
    compositeSloRepository: CompositeSLORepository;
    sloDefinitionRepository: SLODefinitionRepository;
    summaryClient: SummaryClient;
    logger: Logger;
}
export declare const updateCompositeSlo: (params: UpdateCompositeSloParams, deps: UpdateCompositeSloDeps) => Promise<UpdateCompositeSLOResponse>;
