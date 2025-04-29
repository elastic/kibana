/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES, Logger } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from '../constants';
import { AttackDiscoveryExecutorOptions, AttackDiscoveryScheduleType } from '../types';
import { attackDiscoveryScheduleExecutor } from './executor';

export interface GetAttackDiscoveryScheduleParams {
  logger: Logger;
}

export const getAttackDiscoveryScheduleType = ({
  logger,
}: GetAttackDiscoveryScheduleParams): AttackDiscoveryScheduleType => {
  return {
    id: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    name: 'Attack Discovery Schedule',
    ruleTaskTimeout: '30m',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: 'siem',
    solution: 'security',
    validate: {
      params: {
        validate: (object: unknown) => {
          return AttackDiscoveryScheduleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: AttackDiscoveryScheduleParams },
    },
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    autoRecoverAlerts: false,
    alerts: ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
    executor: async (options: AttackDiscoveryExecutorOptions) => {
      return attackDiscoveryScheduleExecutor({
        options,
        logger,
      });
    },
  };
};
