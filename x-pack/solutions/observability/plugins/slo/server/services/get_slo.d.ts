import type { GetSLOParams, GetSLOResponse } from '@kbn/slo-schema';
import type { SLODefinitionClient } from './slo_definition_client';
import type { SummaryClient } from './summary_client';
export declare class GetSLO {
    private definitionClient;
    private summaryClient;
    constructor(definitionClient: SLODefinitionClient, summaryClient: SummaryClient);
    execute(sloId: string, spaceId: string, params?: GetSLOParams): Promise<GetSLOResponse>;
}
