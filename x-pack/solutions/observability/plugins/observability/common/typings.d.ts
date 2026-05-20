import * as t from 'io-ts';
import type { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, ALERT_STATUS_UNTRACKED } from '@kbn/rule-data-utils';
import type { Filter } from '@kbn/es-query';
import type { ALERT_STATUS_ALL } from './constants';
export type Maybe<T> = T | null | undefined;
export declare const alertWorkflowStatusRt: t.KeyofC<{
    open: null;
    acknowledged: null;
    closed: null;
}>;
export type AlertWorkflowStatus = t.TypeOf<typeof alertWorkflowStatusRt>;
export interface ApmIndicesConfig {
    error: string;
    onboarding: string;
    span: string;
    transaction: string;
    metric: string;
}
export type AlertStatus = typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED | typeof ALERT_STATUS_UNTRACKED | typeof ALERT_STATUS_ALL;
export interface AlertStatusFilter {
    status: AlertStatus;
    query: string;
    filter: Filter[];
    label: string;
}
export interface Group {
    field: string;
    value: string;
}
export interface TimeRange {
    from?: string;
    to?: string;
}
export interface EventNonEcsData {
    field: string;
    value?: Maybe<string[]>;
}
export type GroupBy = Group[];
