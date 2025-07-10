/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/elastic-assistant-common';
import { convertAlertingRuleToSchedule } from '../../../../routes/attack_discovery/schedules/utils/convert_alerting_rule_to_schedule';
import { AttackDiscoveryScheduleFindOptions } from '../types';
import { convertScheduleActionsToAlertingActions } from './utils/transform_actions';

/**
 * Params for when creating AttackDiscoveryScheduleDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface CreateAttackDiscoveryScheduleDataClientParams {
  actionsClient: ActionsClient;
  logger: Logger;
  rulesClient: RulesClient;
}

export interface AttackDiscoveryScheduleDataClientParams {
  actionsClient: ActionsClient;
  logger: Logger;
  rulesClient: RulesClient;
}

export class AttackDiscoveryScheduleDataClient {
  constructor(public readonly options: AttackDiscoveryScheduleDataClientParams) {}

  public findSchedules = async ({
    page = 0,
    perPage,
    sort: sortParam = {},
  }: AttackDiscoveryScheduleFindOptions = {}) => {
    // TODO: add filtering
    const results = await this.options.rulesClient.find<AttackDiscoveryScheduleParams>({
      options: {
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
      logger: this.options.logger,
      scheduleActions: ruleToCreate.actions,
    });
    const rule = await this.options.rulesClient.create<AttackDiscoveryScheduleParams>({
      data: {
        actions,
        ...(systemActions.length ? { systemActions } : {}),
        alertTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
        consumer: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
        enabled,
        tags: [],
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
      logger: this.options.logger,
      scheduleActions: ruleToUpdate.actions,
    });
    const rule = await this.options.rulesClient.update<AttackDiscoveryScheduleParams>({
      id,
      data: {
        actions,
        ...(systemActions.length ? { systemActions } : {}),
        tags: [],
        ...updatePayload,
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
