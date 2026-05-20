import type { Filter } from '@kbn/es-query';
import type { AlertStatusFilter } from '../../../common/typings';
export declare const EMPTY_FILTERS: Filter[];
export declare const DEFAULT_QUERY_STRING = "";
export declare const ALL_ALERTS: AlertStatusFilter;
export declare const ACTIVE_ALERTS: AlertStatusFilter;
export declare const RECOVERED_ALERTS: AlertStatusFilter;
export declare const UNTRACKED_ALERTS: AlertStatusFilter;
export declare const ALERT_STATUS_QUERY: {
    [ACTIVE_ALERTS.status]: string;
    [RECOVERED_ALERTS.status]: string;
    [UNTRACKED_ALERTS.status]: string;
};
export declare const ALERT_STATUS_FILTER: {
    [ACTIVE_ALERTS.status]: Filter[];
    [RECOVERED_ALERTS.status]: Filter[];
    [UNTRACKED_ALERTS.status]: Filter[];
};
