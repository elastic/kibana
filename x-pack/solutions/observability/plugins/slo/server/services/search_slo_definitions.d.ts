import type { SearchSLODefinitionsParams, SearchSLODefinitionResponse } from '@kbn/slo-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SLOSettings } from '../domain/models';
export declare class SearchSLODefinitions {
    private esClient;
    private logger;
    private spaceId;
    private settings;
    constructor(esClient: ElasticsearchClient, logger: Logger, spaceId: string, settings: SLOSettings);
    execute(params: SearchSLODefinitionsParams): Promise<SearchSLODefinitionResponse>;
}
