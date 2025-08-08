/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import {
  GetViewInAppRelativeUrlFnOpts,
  AlertInstanceContext as AlertContext,
  RuleExecutorOptions,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import { asyncForEach } from '@kbn/std';
import { SYNTHETICS_ALERT_RULE_TYPES } from '@kbn/rule-data-utils';
import {
  tlsRuleParamsSchema,
  type TLSRuleParams,
} from '@kbn/response-ops-rule-params/synthetics_tls';
import {
  getAlertDetailsUrl,
  observabilityFeatureId,
  observabilityPaths,
} from '@kbn/observability-plugin/common';
import { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from '../../types';
import { getCertSummary, getTLSAlertDocument, setTLSRecoveredAlertsContext } from './message_utils';
import { SyntheticsCommonState } from '../../../common/runtime_types/alert_rules/common';
import { TLSRuleExecutor } from './tls_rule_executor';
import { TLS_CERTIFICATE } from '../../../common/constants/synthetics_alerts';
import { SyntheticsRuleTypeAlertDefinition, updateState } from '../common';
import { ALERT_DETAILS_URL, getActionVariables } from '../action_variables';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

type TLSActionGroups = ActionGroupIdsOf<typeof TLS_CERTIFICATE>;
type TLSRuleTypeState = SyntheticsCommonState;
type TLSAlertState = ReturnType<typeof getCertSummary>;
type TLSAlertContext = AlertContext;
type TLSAlert = ObservabilityUptimeAlert;

export const registerSyntheticsTLSCheckRule = (
  server: SyntheticsServerSetup,
  plugins: SyntheticsPluginsSetupDependencies,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => {
  if (!plugins.alerting) {
    throw new Error(
      'Cannot register the synthetics TLS check rule type. The alerting plugin needs to be enabled.'
    );
  }

  plugins.alerting.registerType({
    id: SYNTHETICS_ALERT_RULE_TYPES.TLS,
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'uptime',
    solution: observabilityFeatureId,
    name: TLS_CERTIFICATE.name,
    validate: {
      params: tlsRuleParamsSchema,
    },
    defaultActionGroupId: TLS_CERTIFICATE.id,
    actionGroups: [TLS_CERTIFICATE],
    actionVariables: getActionVariables({ plugins }),
    isExportable: true,
    minimumLicenseRequired: 'basic',
    doesSetRecoveryContext: true,
    executor: async (
      options: RuleExecutorOptions<
        TLSRuleParams,
        TLSRuleTypeState,
        TLSAlertState,
        TLSAlertContext,
        TLSActionGroups,
        TLSAlert
      >
    ) => {
      const { state: ruleState, params, services, spaceId, previousStartedAt, rule } = options;
      const { alertsClient, savedObjectsClient, scopedClusterClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }
      const { basePath } = server;

      const tlsRule = new TLSRuleExecutor(
        previousStartedAt,
        params,
        savedObjectsClient,
        scopedClusterClient.asCurrentUser,
        server,
        syntheticsMonitorClient,
        spaceId,
        rule.name
      );

      const { foundCerts, certs, absoluteExpirationThreshold, absoluteAgeThreshold, latestPings } =
        await tlsRule.getExpiredCertificates();

      await asyncForEach(certs, async (cert) => {
        const summary = getCertSummary(cert, absoluteExpirationThreshold, absoluteAgeThreshold);

        if (!summary.summary || !summary.status) {
          return;
        }

        const alertId = cert.sha256;
        const { uuid } = alertsClient.report({
          id: alertId,
          actionGroup: TLS_CERTIFICATE.id,
          state: { ...updateState(ruleState, foundCerts), ...summary },
        });

        const payload = getTLSAlertDocument(cert, summary, uuid);

        const context = {
          [ALERT_DETAILS_URL]: await getAlertDetailsUrl(basePath, spaceId, uuid),
          ...summary,
        };

        alertsClient.setAlertData({
          id: alertId,
          payload,
          context,
        });
      });

      await setTLSRecoveredAlertsContext({
        alertsClient,
        basePath,
        spaceId,
        latestPings,
      });

      return { state: updateState(ruleState, foundCerts) };
    },
    alerts: SyntheticsRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
};
