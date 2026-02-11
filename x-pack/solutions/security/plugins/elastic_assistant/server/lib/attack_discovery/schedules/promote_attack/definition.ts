/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID } from '@kbn/elastic-assistant-common';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import { attackPromotionExecutor } from './executor';
import type { AttackPromotionExecutorOptions, AttackPromotionRuleType } from './types';
import { AttackPromotionParams } from './types';
import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from '../constants';

export const getAttackPromotionRuleType = (): AttackPromotionRuleType => {
  return {
    id: ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID,
    name: 'Attack Promotion',
    ruleTaskTimeout: '10m',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: 'siem',
    solution: 'security',
    priority: TaskPriority.Normal,
    validate: {
      params: {
        validate: (object: unknown) => {
          return AttackPromotionParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: AttackPromotionParams },
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    autoRecoverAlerts: false,
    alerts: ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
    executor: (options: AttackPromotionExecutorOptions) => {
      return attackPromotionExecutor(options);
    },
  };
};
