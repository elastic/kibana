/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';

import { AttackDiscoveryExecutorOptions } from '../types';

export interface AttackDiscoveryScheduleExecutorParams {
  options: AttackDiscoveryExecutorOptions;
  logger: Logger;
}

export const attackDiscoveryScheduleExecutor = async ({
  options,
  logger,
}: AttackDiscoveryScheduleExecutorParams) => {
  const { services } = options;
  const { alertsClient } = services;
  if (!alertsClient) {
    throw new AlertsClientError();
  }

  // TODO: implement "attack discovery schedule" executor handler

  logger.info(
    `Attack discovery schedule "[${ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID}]" executing...`
  );

  return { state: {} };
};
