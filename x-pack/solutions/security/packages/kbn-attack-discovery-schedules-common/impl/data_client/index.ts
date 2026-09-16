/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
  BulkActionAttackDiscoverySchedulesResponse,
} from '@kbn/elastic-assistant-common';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
} from '@kbn/elastic-assistant-common';
import { convertAlertingRuleToSchedule } from '../transforms/convert_alerting_rule_to_schedule';
import { convertScheduleActionsToAlertingActions } from '../transforms/convert_schedule_actions_to_alerting_actions';
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

export class AttackDiscoveryScheduleDataClient {
  constructor(public readonly options: AttackDiscoveryScheduleDataClientParams) {}

  private buildTagFilter(): string | undefined {
    const { filterTags } = this.options;
    if (filterTags == null) {
      return undefined;
    }

    const parts: string[] = [];

    if (filterTags.includeTags != null && filterTags.includeTags.length > 0) {
      const includeFilters = filterTags.includeTags.map((tag) => `alert.attributes.tags: "${tag}"`);
      parts.push(...includeFilters);
    }

    if (filterTags.excludeTags != null && filterTags.excludeTags.length > 0) {
      const excludeFilters = filterTags.excludeTags.map(
        (tag) => `NOT alert.attributes.tags: "${tag}"`
      );
      parts.push(...excludeFilters);
    }

    return parts.length > 0 ? parts.join(' AND ') : undefined;
  }

  private buildTags(): string[] {
    const { applyTags } = this.options;
    return applyTags != null ? [...applyTags] : [];
  }

  /**
   * Returns true when the given rule tags satisfy this client's `filterTags`,
   * mirroring `buildTagFilter()` semantics: ALL `includeTags` must be present
   * AND NO `excludeTags` may be present. When `filterTags` is not configured
   * (e.g. the internal/workflow client, which is intentionally a superset),
   * every schedule is visible.
   */
  private tagsSatisfyFilter(tags: string[] | undefined): boolean {
    const { filterTags } = this.options;
    if (filterTags == null) {
      return true;
    }

    const ruleTags = tags ?? [];
    const { includeTags, excludeTags } = filterTags;

    if (
      includeTags != null &&
      includeTags.length > 0 &&
      !includeTags.every((tag) => ruleTags.includes(tag))
    ) {
      return false;
    }

    if (
      excludeTags != null &&
      excludeTags.length > 0 &&
      excludeTags.some((tag) => ruleTags.includes(tag))
    ) {
      return false;
    }

    return true;
  }

  /**
   * Guards by-ID access so a client can only act on schedules its `filterTags`
   * would surface via `findSchedules`. On mismatch we throw the same not-found
   * error the saved objects layer throws for a missing id, so a filtered-out
   * schedule is indistinguishable from one that does not exist (no existence
   * disclosure) and each route's `transformError` yields a 404.
   */
  private assertScheduleVisible(id: string, tags: string[] | undefined): void {
    if (!this.tagsSatisfyFilter(tags)) {
      throw Boom.notFound(`Saved object [alert/${id}] not found`);
    }
  }

  /**
   * For by-ID mutations that don't otherwise read the rule, fetch it ONLY when
   * `filterTags` is configured (the internal client, which has no `filterTags`,
   * skips this extra read) and assert visibility before mutating.
   */
  private assertVisibleIfFiltered = async (id: string): Promise<void> => {
    if (this.options.filterTags == null) {
      return;
    }
    const rule = await this.options.rulesClient.get<AttackDiscoveryScheduleParams>({ id });
    this.assertScheduleVisible(id, rule.tags);
  };

  public findSchedules = async ({
    page = 0,
    perPage,
    sort: sortParam = {},
  }: AttackDiscoveryScheduleFindOptions = {}) => {
    const results = await this.options.rulesClient.find<AttackDiscoveryScheduleParams>({
      options: {
        filter: this.buildTagFilter(),
        page: page + 1,
        perPage,
        sortField: sortParam.sortField,
        sortOrder: sortParam.sortDirection,
        ruleTypeIds: [ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID],
      },
    });

    const { total, data } = results;
    const schedules = data.map(convertAlertingRuleToSchedule);

    return { total, data: schedules };
  };

  public getSchedule = async (id: string): Promise<AttackDiscoverySchedule> => {
    const rule = await this.options.rulesClient.get<AttackDiscoveryScheduleParams>({ id });
    this.assertScheduleVisible(id, rule.tags);
    const schedule = convertAlertingRuleToSchedule(rule);
    return schedule;
  };

  public createSchedule = async (
    ruleToCreate: AttackDiscoveryScheduleCreateProps
  ): Promise<AttackDiscoverySchedule> => {
    const { enabled = false, actions: _, ...restScheduleAttributes } = ruleToCreate;
    const { actions, systemActions } = convertScheduleActionsToAlertingActions({
      actionsClient: this.options.actionsClient,
      scheduleActions: ruleToCreate.actions,
    });
    const rule = await this.options.rulesClient.create<AttackDiscoveryScheduleParams>({
      data: {
        actions,
        ...(systemActions.length ? { systemActions } : {}),
        alertTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
        consumer: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
        enabled,
        ...restScheduleAttributes,
        // Applied AFTER the spread so a future caller-supplied `tags` can never
        // silently defeat the isolation tagging the internal API relies on.
        tags: this.buildTags(),
      },
    });
    const schedule = convertAlertingRuleToSchedule(rule);
    return schedule;
  };

  public updateSchedule = async (
    ruleToUpdate: AttackDiscoveryScheduleUpdateProps & { id: string }
  ): Promise<AttackDiscoverySchedule> => {
    const { id, actions: _, ...updatePayload } = ruleToUpdate;

    const { actions, systemActions } = convertScheduleActionsToAlertingActions({
      actionsClient: this.options.actionsClient,
      scheduleActions: ruleToUpdate.actions,
    });

    const existingRule = await this.options.rulesClient.get<AttackDiscoveryScheduleParams>({ id });
    this.assertScheduleVisible(id, existingRule.tags);
    const existingTags = existingRule.tags ?? [];
    const mergedTags = [...new Set([...existingTags, ...this.buildTags()])];

    const rule = await this.options.rulesClient.update<AttackDiscoveryScheduleParams>({
      id,
      data: {
        ...updatePayload,
        actions,
        ...(systemActions.length ? { systemActions } : {}),
        tags: mergedTags,
      },
    });
    const schedule = convertAlertingRuleToSchedule(rule);
    return schedule;
  };

  public deleteSchedule = async (ruleToDelete: { id: string }) => {
    await this.assertVisibleIfFiltered(ruleToDelete.id);
    await this.options.rulesClient.delete(ruleToDelete);
  };

  public enableSchedule = async (ruleToEnable: { id: string }) => {
    await this.assertVisibleIfFiltered(ruleToEnable.id);
    await this.options.rulesClient.enableRule(ruleToEnable);
  };

  public disableSchedule = async (ruleToDisable: { id: string }) => {
    await this.assertVisibleIfFiltered(ruleToDisable.id);
    await this.options.rulesClient.disableRule(ruleToDisable);
  };

  private transformBulkActionResult = ({
    errors,
    rules,
    total,
  }: {
    errors: BulkActionAttackDiscoverySchedulesResponse['errors'];
    rules: Array<{ id: string }>;
    total: number;
  }): BulkActionAttackDiscoverySchedulesResponse => ({
    errors,
    ids: rules.map(({ id }) => id),
    total,
  });

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
  private filterVisibleIds = async (ids: string[]): Promise<string[]> => {
    if (this.options.filterTags == null) {
      return ids;
    }

    const visibility = await Promise.all(
      ids.map(async (id) => {
        try {
          const rule = await this.options.rulesClient.get<AttackDiscoveryScheduleParams>({ id });
          return this.tagsSatisfyFilter(rule.tags) ? id : undefined;
        } catch {
          return undefined;
        }
      })
    );

    return visibility.filter((id): id is string => id != null);
  };

  /**
   * Bulk methods delegate to the Alerting `RulesClient` bulk APIs (query-based),
   * matching the public Attack Discovery schedules contract from
   * https://github.com/elastic/kibana/issues/266760: ids that do not resolve to
   * a visible rule are silently excluded, so `total` reflects the rules actually
   * matched and `errors` only carries genuine per-rule failures. For a filtered
   * (public) client the requested ids are first narrowed to the ones the caller
   * may see (`filterVisibleIds`), preserving legacy↔workflow tag isolation.
   */
  public bulkDeleteSchedules = async ({
    ids,
  }: {
    ids: string[];
  }): Promise<BulkActionAttackDiscoverySchedulesResponse> => {
    const visibleIds = await this.filterVisibleIds(ids);
    if (visibleIds.length === 0) {
      return { errors: [], ids: [], total: 0 };
    }
    const result = await this.options.rulesClient.bulkDeleteRules({ ids: visibleIds });
    return this.transformBulkActionResult(result);
  };

  public bulkEnableSchedules = async ({
    ids,
  }: {
    ids: string[];
  }): Promise<BulkActionAttackDiscoverySchedulesResponse> => {
    const visibleIds = await this.filterVisibleIds(ids);
    if (visibleIds.length === 0) {
      return { errors: [], ids: [], total: 0 };
    }
    const result = await this.options.rulesClient.bulkEnableRules({ ids: visibleIds });
    return this.transformBulkActionResult(result);
  };

  public bulkDisableSchedules = async ({
    ids,
  }: {
    ids: string[];
  }): Promise<BulkActionAttackDiscoverySchedulesResponse> => {
    const visibleIds = await this.filterVisibleIds(ids);
    if (visibleIds.length === 0) {
      return { errors: [], ids: [], total: 0 };
    }
    const result = await this.options.rulesClient.bulkDisableRules({ ids: visibleIds });
    return this.transformBulkActionResult(result);
  };
}
