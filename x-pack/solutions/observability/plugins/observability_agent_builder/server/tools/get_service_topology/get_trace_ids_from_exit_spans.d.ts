import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
/**
 * Get trace IDs from exit spans that target a specific external dependency.
 * Used as a fallback for upstream topology when the target has no transactions
 * (e.g., databases like "postgres", caches like "redis").
 *
 * Searches by exact `span.destination.service.resource` match only — no heuristic/fuzzy matching.
 */
export declare function getTraceIdsFromExitSpansTargetingDependency({ apmEventClient, dependencyName, start, end, maxTraces, }: {
    apmEventClient: APMEventClient;
    dependencyName: string;
    start: number;
    end: number;
    maxTraces?: number;
}): Promise<string[]>;
