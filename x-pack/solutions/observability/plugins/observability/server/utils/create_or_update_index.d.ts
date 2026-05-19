import type { estypes } from '@elastic/elasticsearch';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
export type Mappings = Required<estypes.IndicesCreateRequest>['mappings'] & Omit<estypes.IndicesPutMappingRequest, 'index'>;
export declare function createOrUpdateIndex({ index, mappings, client, logger, }: {
    index: string;
    mappings?: Mappings;
    client: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
