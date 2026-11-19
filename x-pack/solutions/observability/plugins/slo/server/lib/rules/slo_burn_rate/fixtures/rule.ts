/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { SavedObject } from '@kbn/core/server';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../../../common/constants';
import type { SLODefinition } from '../../../../domain/models';
import type { BurnRateRuleParams } from '../types';

export function createBurnRateRuleSavedObject(
  ruleId: string,
  ruleParams: BurnRateRuleParams
): SavedObject<Rule<BurnRateRuleParams>> {
  return {
    id: ruleId,
    type: 'alert',
    references: [],
    attributes: {
      id: ruleId,
      enabled: true,
      name: 'Fake Parent Rule for SLO Burn Rate',
      alertTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
      consumer: 'observability',
      schedule: { interval: '1m' },
      params: ruleParams,
      tags: [],
      actions: [],
      createdBy: 'nobody',
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'nobody',
      apiKey: 'some-fake-key',
      apiKeyOwner: 'some-user',
      muteAll: false,
      mutedInstanceIds: [],
      revision: 1,
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
    },
  };
}

export function createBurnRateRule(
  slo: SLODefinition,
  params: Partial<BurnRateRuleParams> = {}
): BurnRateRuleParams {
  return {
    sloId: slo.id,
    windows: [
      {
        id: v4(),
        burnRateThreshold: 14.4,
        maxBurnRateThreshold: null,
        longWindow: { value: 1, unit: 'h' },
        shortWindow: { value: 5, unit: 'm' },
        actionGroup: ALERT_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 6,
        maxBurnRateThreshold: null,
        longWindow: { value: 6, unit: 'h' },
        shortWindow: { value: 30, unit: 'm' },
        actionGroup: HIGH_PRIORITY_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 3,
        maxBurnRateThreshold: null,
        longWindow: { value: 24, unit: 'h' },
        shortWindow: { value: 120, unit: 'm' },
        actionGroup: MEDIUM_PRIORITY_ACTION.id,
      },
      {
        id: v4(),
        burnRateThreshold: 1,
        maxBurnRateThreshold: null,
        longWindow: { value: 72, unit: 'h' },
        shortWindow: { value: 360, unit: 'm' },
        actionGroup: LOW_PRIORITY_ACTION.id,
      },
    ],
    ...params,
  };
}
