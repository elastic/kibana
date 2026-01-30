/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { AlertInstanceContext, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import {
  CreateAttackDiscoveryAlertsParams as CreateAttackDiscoveryAlertsParamsSchema,
  type CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';
import { TaskPriority } from '@kbn/task-manager-plugin/server';

import type { AttackDiscoveryAlertDocument } from '../schedules/types';
import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from '../schedules/constants';
import { ATTACK_DISCOVERY_DATA_GENERATOR_RULE_TYPE_ID } from './constants';
import { attackDiscoveryDataGeneratorExecutor } from './executor';

export interface GetAttackDiscoveryDataGeneratorRuleParams {
  logger: Logger;
  publicBaseUrl: string | undefined;
}

export type AttackDiscoveryDataGeneratorRuleType = RuleType<
  CreateAttackDiscoveryAlertsParams,
  never,
  RuleTypeState,
  {},
  AlertInstanceContext,
  'default',
  never,
  AttackDiscoveryAlertDocument
>;

export const getAttackDiscoveryDataGeneratorRuleType = ({
  logger,
  publicBaseUrl,
}: GetAttackDiscoveryDataGeneratorRuleParams): AttackDiscoveryDataGeneratorRuleType => {
  return {
    id: ATTACK_DISCOVERY_DATA_GENERATOR_RULE_TYPE_ID,
    name: 'Attack Discovery Data Generator (dev-only)',
    ruleTaskTimeout: '5m',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: 'siem',
    solution: 'security',
    priority: TaskPriority.Normal,
    validate: {
      params: {
        validate: (object: unknown) => CreateAttackDiscoveryAlertsParamsSchema.parse(object),
      },
    },
    schemas: {
      params: { type: 'zod', schema: CreateAttackDiscoveryAlertsParamsSchema },
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    autoRecoverAlerts: false,
    alerts: ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
    executor: async (options) =>
      attackDiscoveryDataGeneratorExecutor({
        options,
        logger,
        publicBaseUrl,
      }),
  };
};
