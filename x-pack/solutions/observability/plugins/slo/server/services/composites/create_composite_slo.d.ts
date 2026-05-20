import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CreateCompositeSLOInput, CreateCompositeSLOResponse } from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
export interface CreateCompositeSloParams extends CreateCompositeSLOInput {
    spaceId: string;
    userId: string;
}
export interface CreateCompositeSloDeps {
    esClient: ElasticsearchClient;
    compositeSloRepository: CompositeSLORepository;
    sloDefinitionRepository: SLODefinitionRepository;
    summaryClient: SummaryClient;
    logger: Logger;
}
export declare const createCompositeSlo: (params: CreateCompositeSloParams, deps: CreateCompositeSloDeps) => Promise<CreateCompositeSLOResponse>;
