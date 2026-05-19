import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
export declare function createOrUpdateIndexTemplate({ indexTemplate, client, logger, }: {
    indexTemplate: IndicesPutIndexTemplateRequest;
    client: ElasticsearchClient;
    logger: Logger;
}): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase | undefined>;
