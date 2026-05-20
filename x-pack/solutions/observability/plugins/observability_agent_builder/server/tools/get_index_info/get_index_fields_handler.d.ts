import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ModelProvider } from '@kbn/agent-builder-server';
export interface IndexFieldsResult {
    fieldsByType: Record<string, string[]>;
    message?: string;
}
/**
 * Extracts all field paths from a nested object.
 * e.g., { a: { b: 1, c: 2 } } -> ['a.b', 'a.c']
 */
export declare function extractFieldPaths(obj: Record<string, unknown>, prefix?: string): string[];
/**
 * Returns fields from a specific index pattern that have actual data, grouped by type.
 * Samples up to 1000 documents to discover populated fields.
 * When userIntentDescription is provided and field count exceeds threshold, uses LLM to filter.
 */
export declare function listFieldsHandler({ esClient, index, intent, start, end, kqlFilter, modelProvider, logger, }: {
    esClient: IScopedClusterClient;
    index: string;
    intent?: string;
    start: string;
    end: string;
    kqlFilter?: string;
    modelProvider: ModelProvider;
    logger: Logger;
}): Promise<IndexFieldsResult>;
