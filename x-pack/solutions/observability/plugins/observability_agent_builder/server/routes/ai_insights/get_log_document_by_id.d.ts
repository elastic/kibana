import type { ElasticsearchClient } from '@kbn/core/server';
declare const LOG_DOCUMENT_FIELDS: readonly ["@timestamp", "message", "log.level", "service.name", "trace.id", "span.id", "http.response.status_code", "error.exception.message"];
type FieldKeys = (typeof LOG_DOCUMENT_FIELDS)[number];
export type LogDocument = {
    'log.level'?: string;
    '@timestamp'?: string;
    message?: string;
    'http.response.status_code'?: number;
    'error.exception.message'?: string;
} & {
    [K in FieldKeys]?: unknown;
};
export declare const getLogDocumentById: ({ esClient, index, id, }: {
    esClient: ElasticsearchClient;
    index: string;
    id: string;
}) => Promise<LogDocument | undefined>;
export {};
