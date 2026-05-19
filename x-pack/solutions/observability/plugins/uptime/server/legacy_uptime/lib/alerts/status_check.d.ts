import type { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type { MonitorSummary, UptimeAlertTypeFactory } from './types';
import type { StatusCheckFilters, Ping, GetMonitorAvailabilityParams } from '../../../../common/runtime_types';
import { MONITOR_STATUS } from '../../../../common/constants/uptime_alerts';
import type { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import type { GetMonitorStatusResult, GetMonitorDownStatusMessageParams } from '../requests/get_monitor_status';
import type { IndexPatternTitleAndFields } from '../requests/get_index_pattern';
import type { UMServerLibs } from '../lib';
import { UptimeEsClient } from '../lib';
export type ActionGroupIds = ActionGroupIdsOf<typeof MONITOR_STATUS>;
/**
 * Returns the appropriate range for filtering the documents by `@timestamp`.
 *
 * We check monitor status by `monitor.timespan`, but need to first cut down on the number of documents
 * searched by filtering by `@timestamp`. To ensure that we catch as many documents as possible which could
 * likely contain a down monitor with a `monitor.timespan` in the given timerange, we create a filter
 * range for `@timestamp` that is the greater of either: from now to now - timerange interval - 24 hours
 * OR from now to now - rule interval
 * @param ruleScheduleLookback - string representing now minus the interval at which the rule is ran
 * @param timerangeLookback - string representing now minus the timerange configured by the user for checking down monitors
 */
export declare function getTimestampRange({ ruleScheduleLookback, timerangeLookback, }: Record<'ruleScheduleLookback' | 'timerangeLookback', string>): {
    to: string;
    from: string | number;
};
export declare const getUniqueIdsByLoc: (downMonitorsByLocation: GetMonitorStatusResult[], availabilityResults: GetMonitorAvailabilityResult[]) => Set<string>;
export declare const hasFilters: (filters?: StatusCheckFilters) => boolean;
export declare const generateFilterDSL: (getIndexPattern: () => Promise<IndexPatternTitleAndFields | undefined>, filters?: StatusCheckFilters, search?: string) => Promise<NonNullable<import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer> | undefined>;
export declare const formatFilterString: (uptimeEsClient: UptimeEsClient, filters?: StatusCheckFilters, search?: string, libs?: UMServerLibs) => Promise<NonNullable<import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer> | undefined>;
export declare const getMonitorSummary: (monitorInfo: Ping & {
    "@timestamp"?: string;
}, statusMessage: string) => MonitorSummary;
export declare const getReasonMessage: ({ name, status, location, timestamp, }: {
    name: string;
    location: string;
    status: string;
    timestamp: string;
}) => string;
export declare const getMonitorAlertDocument: (monitorSummary: MonitorSummary) => {
    'monitor.id': string;
    configId: string | undefined;
    'monitor.type': string;
    'monitor.name': string;
    'monitor.tags': string[] | undefined;
    'url.full': string | undefined;
    'observer.geo.name': string[];
    'observer.name': string[];
    'error.message': string | undefined;
    'agent.name': string | undefined;
    "kibana.alert.reason": string;
};
export declare const getStatusMessage: (downMonParams?: GetMonitorDownStatusMessageParams, availMonInfo?: GetMonitorAvailabilityResult, availability?: GetMonitorAvailabilityParams) => string;
export declare const getInstanceId: (monitorInfo: Ping, monIdByLoc: string) => string;
export declare const statusCheckAlertFactory: UptimeAlertTypeFactory<ActionGroupIds>;
