import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FindSLODefinitionsParams, FindSLODefinitionsResponse } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from './slo_definition_repository';
export declare class FindSLODefinitions {
    private repository;
    private scopedClusterClient;
    private logger;
    constructor(repository: SLODefinitionRepository, scopedClusterClient: IScopedClusterClient, logger: Logger);
    execute(params: FindSLODefinitionsParams): Promise<FindSLODefinitionsResponse>;
    private mergeWithHealth;
}
