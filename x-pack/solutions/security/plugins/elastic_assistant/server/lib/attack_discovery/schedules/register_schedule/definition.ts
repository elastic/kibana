/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

import { TaskPriority } from '@kbn/task-manager-plugin/server';
import {
  ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
  type AttackDiscoveryExecutorOptions,
  type AttackDiscoveryScheduleType,
} from '@kbn/attack-discovery-schedules-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { AttackDiscoveryWorkflowExecutorFactory } from '../../../../types';
import { attackDiscoveryScheduleExecutor } from './executor';

export interface GetAttackDiscoveryScheduleParams {
  getInference: () => InferenceServerStart | undefined;
  getWorkflowExecutorFactory: () => AttackDiscoveryWorkflowExecutorFactory | undefined;
  logger: Logger;
  publicBaseUrl: string | undefined;
  telemetry: AnalyticsServiceSetup;
}

export const getAttackDiscoveryScheduleType = ({
  getInference,
  getWorkflowExecutorFactory,
  logger,
  publicBaseUrl,
  telemetry,
}: GetAttackDiscoveryScheduleParams): AttackDiscoveryScheduleType => {
  return {
    id: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    name: 'Attack Discovery Schedule',
    ruleTaskTimeout: '10m',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: 'siem',
    solution: 'security',
    priority: TaskPriority.NormalLongRunning,
    validate: {
      params: {
        validate: (object: unknown) => {
          return AttackDiscoveryScheduleParams.parse(object);
        },
      },
    },
    schemas: {
      params: {
        type: 'zod',
        schema: AttackDiscoveryScheduleParams,
      },
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
        getInference,
        getWorkflowExecutorFactory,
        options,
        logger,
        publicBaseUrl,
        telemetry,
      });
    },
  };
};
