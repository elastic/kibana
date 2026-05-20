import type { Logger } from '@kbn/core/server';
import type { ApmEventClient } from './types';
import type { SpanExceptionSample } from './get_span_exception_groups';
/**
 * Fetches "first seen" for each error group using a lookback window (7 days)
 * This helps distinguish new errors from recurring ones.
 *
 * This is a two-step process:
 * 1. Find the earliest occurrence within the lookback window (possibly slow, but time-range-bounded).
 * 2. In parallel, check which error groups existed before the lookback window (not time-range-bounded, but very fast with terminate_after: 1).
 *
 * Returns an exact ISO timestamp for recent error (first seen within 7 days), or "over 7 days ago" otherwise.
 */
export declare function getFirstSeenPerGroup({ apmEventClient, spanExceptionSamples: errorGroups, endMs, logger, }: {
    apmEventClient: ApmEventClient;
    spanExceptionSamples: SpanExceptionSample[];
    endMs: number;
    logger: Logger;
}): Promise<Map<string, string>>;
