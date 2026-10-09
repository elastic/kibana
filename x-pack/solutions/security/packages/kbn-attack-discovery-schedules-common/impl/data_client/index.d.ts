import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { AttackDiscoverySchedule, AttackDiscoveryScheduleCreateProps, AttackDiscoveryScheduleUpdateProps, BulkActionAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryScheduleFindOptions } from '../types';
export interface FilterTags {
    /** Only include schedules whose tags contain ALL of these values */
    includeTags?: string[];
    /** Exclude schedules whose tags contain ANY of these values */
    excludeTags?: string[];
}
export interface CreateAttackDiscoveryScheduleDataClientParams {
    actionsClient: ActionsClient;
    /** Tags to apply when creating or updating schedules (write-time) */
    applyTags?: string[];
    filterTags?: FilterTags;
    logger: Logger;
    rulesClient: RulesClient;
}
export interface AttackDiscoveryScheduleDataClientParams {
    actionsClient: ActionsClient;
    /** Tags to apply when creating or updating schedules (write-time) */
    applyTags?: string[];
    filterTags?: FilterTags;
    logger: Logger;
    rulesClient: RulesClient;
}
export declare class AttackDiscoveryScheduleDataClient {
    readonly options: AttackDiscoveryScheduleDataClientParams;
    constructor(options: AttackDiscoveryScheduleDataClientParams);
    private buildTagFilter;
    private buildTags;
    /**
     * Returns true when the given rule tags satisfy this client's `filterTags`,
     * mirroring `buildTagFilter()` semantics: ALL `includeTags` must be present
     * AND NO `excludeTags` may be present. When `filterTags` is not configured
     * (e.g. the internal/workflow client, which is intentionally a superset),
     * every schedule is visible.
     */
    private tagsSatisfyFilter;
    /**
     * Guards by-ID access so a client can only act on schedules its `filterTags`
     * would surface via `findSchedules`. On mismatch we throw the same not-found
     * error the saved objects layer throws for a missing id, so a filtered-out
     * schedule is indistinguishable from one that does not exist (no existence
     * disclosure) and each route's `transformError` yields a 404.
     */
    private assertScheduleVisible;
    /**
     * For by-ID mutations that don't otherwise read the rule, fetch it ONLY when
     * `filterTags` is configured (the internal client, which has no `filterTags`,
     * skips this extra read) and assert visibility before mutating.
     */
    private assertVisibleIfFiltered;
    findSchedules: ({ page, perPage, sort: sortParam, }?: AttackDiscoveryScheduleFindOptions) => Promise<{
        total: number;
        data: {
            id: string;
            name: string;
            createdBy: string;
            updatedBy: string;
            createdAt: string;
            updatedAt: string;
            enabled: boolean;
            params: {
                alertsIndexPattern: string;
                apiConfig: {
                    connectorId: string;
                    actionTypeId: string;
                    defaultSystemPromptId?: string | undefined;
                    provider?: "Azure OpenAI" | "OpenAI" | "Other" | undefined;
                    model?: string | undefined;
                    name: string;
                };
                end?: string | undefined;
                query?: {
                    query: string | {
                        [x: string]: unknown;
                    };
                    language: string;
                } | undefined;
                filters?: unknown[] | undefined;
                combinedFilter?: {
                    [x: string]: unknown;
                } | undefined;
                size: number;
                start?: string | undefined;
                workflowConfig?: {
                    alertRetrievalMode: "custom_query" | "esql";
                    alertRetrievalWorkflowIds: string[];
                    alertRetrievalWorkflowsEnabled: boolean;
                    defaultRetrievalEnabled: boolean;
                    esqlQuery?: string | undefined;
                    skillEnabled: boolean;
                    validationWorkflowId: string;
                } | undefined;
            };
            schedule: {
                interval: string;
            };
            actions: ({
                actionTypeId: string;
                group: string;
                id: string;
                params: {
                    [x: string]: unknown;
                };
                uuid?: string | undefined;
                alertsFilter?: {
                    [x: string]: unknown;
                } | undefined;
                frequency?: {
                    summary: boolean;
                    notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
                    throttle: string | null;
                } | undefined;
            } | {
                actionTypeId: string;
                id: string;
                params: {
                    [x: string]: unknown;
                };
                uuid?: string | undefined;
            })[];
            lastExecution?: {
                date: string;
                duration?: number | undefined;
                status: "active" | "error" | "ok" | "unknown" | "warning";
                message?: string | undefined;
            } | undefined;
        }[];
    }>;
    getSchedule: (id: string) => Promise<AttackDiscoverySchedule>;
    createSchedule: (ruleToCreate: AttackDiscoveryScheduleCreateProps) => Promise<AttackDiscoverySchedule>;
    updateSchedule: (ruleToUpdate: AttackDiscoveryScheduleUpdateProps & {
        id: string;
    }) => Promise<AttackDiscoverySchedule>;
    deleteSchedule: (ruleToDelete: {
        id: string;
    }) => Promise<void>;
    enableSchedule: (ruleToEnable: {
        id: string;
    }) => Promise<void>;
    disableSchedule: (ruleToDisable: {
        id: string;
    }) => Promise<void>;
    private transformBulkActionResult;
    /**
     * Narrows the requested ids to those this client's `filterTags` would surface
     * via `findSchedules`. Both missing ids (no such rule) and hidden ids (tag
     * filtered) are silently dropped, mirroring the by-id single mutations'
     * visibility guard. The unfiltered (internal) client — which has no
     * `filterTags` — returns the ids unchanged, keeping the pure query-based
     * native bulk semantics.
     *
     * This lets the bulk path preserve BOTH the #266760 silent-exclusion contract
     * (missing ids are excluded, not surfaced as per-id errors) AND the
     * legacy↔workflow isolation boundary (a filtered caller can never mutate a
     * schedule it is not allowed to see).
     */
    private filterVisibleIds;
    /**
     * Bulk methods delegate to the Alerting `RulesClient` bulk APIs (query-based),
     * matching the public Attack Discovery schedules contract from
     * https://github.com/elastic/kibana/issues/266760: ids that do not resolve to
     * a visible rule are silently excluded, so `total` reflects the rules actually
     * matched and `errors` only carries genuine per-rule failures. For a filtered
     * (public) client the requested ids are first narrowed to the ones the caller
     * may see (`filterVisibleIds`), preserving legacy↔workflow tag isolation.
     */
    bulkDeleteSchedules: ({ ids, }: {
        ids: string[];
    }) => Promise<BulkActionAttackDiscoverySchedulesResponse>;
    bulkEnableSchedules: ({ ids, }: {
        ids: string[];
    }) => Promise<BulkActionAttackDiscoverySchedulesResponse>;
    bulkDisableSchedules: ({ ids, }: {
        ids: string[];
    }) => Promise<BulkActionAttackDiscoverySchedulesResponse>;
}
