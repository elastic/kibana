/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type {
  AlertInstanceContext,
  RuleExecutorOptions,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import {
  CreateAttackDiscoveryAlertsParams as CreateAttackDiscoveryAlertsParamsSchema,
  type CreateAttackDiscoveryAlertsParams,
} from '@kbn/elastic-assistant-common';

import type { AttackDiscoveryAlertDocument } from '../schedules/types';
import {
  generateAttackDiscoveryAlertHash,
  transformToBaseAlertDocument,
} from '../persistence/transforms/transform_to_alert_documents';

export interface AttackDiscoveryDataGeneratorExecutorParams {
  logger: Logger;
  publicBaseUrl: string | undefined;
}

type AttackDiscoveryDataGeneratorExecutorOptions = RuleExecutorOptions<
  CreateAttackDiscoveryAlertsParams,
  RuleTypeState,
  {},
  AlertInstanceContext,
  'default',
  AttackDiscoveryAlertDocument
>;

export const attackDiscoveryDataGeneratorExecutor = async ({
  options,
  logger,
  publicBaseUrl,
}: AttackDiscoveryDataGeneratorExecutorParams & {
  options: AttackDiscoveryDataGeneratorExecutorOptions;
}) => {
  const { params, rule, services, spaceId } = options;
  const { alertsClient } = services;

  if (!alertsClient) {
    throw new AlertsClientError();
  }

  // Guard: schema validation is also performed by the rule type, but this keeps executor robust
  // against any drift in rule storage or programmatic invocation.
  const validatedParams = CreateAttackDiscoveryAlertsParamsSchema.parse(params);

  const { attackDiscoveries, generationUuid: _generationUuid, ...alertsParams } = validatedParams;

  for (const attackDiscovery of attackDiscoveries) {
    const alertInstanceId = generateAttackDiscoveryAlertHash({
      attackDiscovery,
      connectorId: alertsParams.apiConfig.connectorId,
      ownerId: rule.id,
      replacements: alertsParams.replacements,
      spaceId,
    });

    const { uuid: alertDocId } = alertsClient.report({
      id: alertInstanceId,
      actionGroup: 'default',
    });

    const baseAlertDocument = transformToBaseAlertDocument({
      alertDocId,
      alertInstanceId,
      attackDiscovery,
      alertsParams,
      publicBaseUrl,
      spaceId,
    });

    alertsClient.setAlertData({
      id: alertInstanceId,
      payload: baseAlertDocument,
      context: {},
    });
  }

  logger.debug(
    () =>
      `Attack discovery data generator persisted ${attackDiscoveries.length} attack discoveries via alertsClient for rule ${rule.id}`
  );

  return { state: {} };
};
