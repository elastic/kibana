import type { QueryContext } from './query_context';
import type { MonitorSummary, Ping } from '../../../../../common/runtime_types';
/**
 * Determines whether the provided check groups are the latest complete check groups for their associated monitor ID's.
 * If provided check groups are not the latest complete group, they are discarded.
 * @param queryContext the data and resources needed to perform the query
 * @param potentialMatchMonitorIDs the monitor ID's of interest
 * @param potentialMatchCheckGroups the check groups to filter for the latest match per ID
 */
export declare const refinePotentialMatches: (queryContext: QueryContext, potentialMatchMonitorIDs: string[]) => Promise<MonitorSummary[]>;
export declare const fullyMatchingIds: (queryResult: any, statusFilter?: string) => MonitorSummary[];
export declare const summaryPingsToSummary: (summaryPings: Ping[]) => MonitorSummary;
export declare const query: (queryContext: QueryContext, potentialMatchMonitorIDs: string[]) => Promise<any>;
