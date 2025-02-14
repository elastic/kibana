/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClientError, ExecutorType, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { IBasePath } from '@kbn/core/server';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { ALERT_ACTION } from '../../../../common/constants';
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../common/field_names/slo';
import { MonitorHealth } from './lib/monitor_health';
import {
  AlertStates,
  HealthAlertContext,
  HealthAlertData,
  HealthAlertState,
  HealthAllowedActionGroups,
  HealthRuleParams,
  HealthRuleTypeState,
} from './types';

export const getExecutor = (basePath: IBasePath) =>
  async function executor(
    options: RuleExecutorOptions<
      HealthRuleParams,
      HealthRuleTypeState,
      HealthAlertState,
      HealthAlertContext,
      HealthAllowedActionGroups,
      HealthAlertData
    >
  ): ReturnType<
    ExecutorType<
      HealthRuleParams,
      HealthRuleTypeState,
      HealthAlertState,
      HealthAlertContext,
      HealthAllowedActionGroups
    >
  > {
    const { services, params, logger, startedAt, spaceId } = options;
    const { savedObjectsClient: soClient, scopedClusterClient: esClient, alertsClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }
    const monitorHealth = new MonitorHealth(
      esClient.asInternalUser,
      soClient,
      logger,
      alertsClient
    );

    // TODO: add params for sloIds, stale and delay time
    await monitorHealth.execute({ spaceId, basePath, startedAt });

    const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
    for (const recoveredAlert of recoveredAlerts) {
      const alertId = recoveredAlert.alert.getId();
      const alertUuid = recoveredAlert.alert.getUuid();
      const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, alertUuid);

      const context = {
        timestamp: startedAt.toISOString(),
        alertDetailsUrl,
      };

      alertsClient.setAlertData({
        id: alertId,
        context,
      });
    }

    return { state: {} };
  };
