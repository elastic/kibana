import type { IScopedClusterClient } from '@kbn/core/server';
import type { FetchSLOHealthParams, FetchSLOHealthResponse } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from './slo_definition_repository';
export declare class GetSLOHealth {
    private scopedClusterClient;
    private repository;
    constructor(scopedClusterClient: IScopedClusterClient, repository: SLODefinitionRepository);
    execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse>;
}
