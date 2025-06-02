/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { CreateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/create';
import { UpdateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/update';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';
import { AttackDiscoveryScheduleFindOptions } from '../types';

/**
 * Params for when creating AttackDiscoveryScheduleDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface CreateAttackDiscoveryScheduleDataClientParams {
  rulesClient: RulesClient;
}

export interface AttackDiscoveryScheduleDataClientParams {
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
    const rules = await this.options.rulesClient.find<AttackDiscoveryScheduleParams>({
      options: {
        page: page + 1,
        perPage,
        sortField: sortParam.sortField,
        sortOrder: sortParam.sortDirection,
        ruleTypeIds: [ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID],
      },
    });
    return rules;
  };

  public getSchedule = async (id: string) => {
    const rule = await this.options.rulesClient.get<AttackDiscoveryScheduleParams>({ id });
    return rule;
  };

  public createSchedule = async (ruleToCreate: CreateRuleData<AttackDiscoveryScheduleParams>) => {
    const rule = await this.options.rulesClient.create<AttackDiscoveryScheduleParams>({
      data: ruleToCreate,
    });
    return rule;
  };

  public updateSchedule = async (
    ruleToUpdate: UpdateRuleData<AttackDiscoveryScheduleParams> & { id: string }
  ) => {
    const { id, ...updatePayload } = ruleToUpdate;
    const rule = await this.options.rulesClient.update<AttackDiscoveryScheduleParams>({
      id,
      data: updatePayload,
    });
    return rule;
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
