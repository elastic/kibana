import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SLODefinition } from '../domain/models';
import type { SLODefinitionRepository } from './slo_definition_repository';
interface SLODefinitionResult {
    slo: SLODefinition;
    remote?: {
        kibanaUrl: string;
        remoteName: string;
    };
}
export declare class SLODefinitionClient {
    private repository;
    private esClient;
    private logger;
    constructor(repository: SLODefinitionRepository, esClient: ElasticsearchClient, logger: Logger);
    execute(sloId: string, spaceId: string, remoteName?: string): Promise<SLODefinitionResult>;
}
export {};
