import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare const checkAnnotationsPermissions: ({ index, esClient, }: {
    index: string;
    esClient: ElasticsearchClient;
}) => Promise<import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesResponse>;
