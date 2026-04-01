/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
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
        tags: this.buildTags(),
        ...restScheduleAttributes,
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
    await this.options.rulesClient.delete(ruleToDelete);
  };

  public enableSchedule = async (ruleToEnable: { id: string }) => {
    await this.options.rulesClient.enableRule(ruleToEnable);
  };

  public disableSchedule = async (ruleToDisable: { id: string }) => {
    await this.options.rulesClient.disableRule(ruleToDisable);
  };
}
