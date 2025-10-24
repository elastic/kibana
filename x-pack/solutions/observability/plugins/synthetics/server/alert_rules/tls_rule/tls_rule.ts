/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type {
  GetViewInAppRelativeUrlFnOpts,
  AlertInstanceContext as AlertContext,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
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
import type { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import type { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from '../../types';
import { getCertSummary, getTLSAlertDocument, setTLSRecoveredAlertsContext } from './message_utils';
import type { SyntheticsCommonState } from '../../../common/runtime_types/alert_rules/common';
import { TLSRuleExecutor } from './tls_rule_executor';
import { TLS_CERTIFICATE } from '../../../common/constants/synthetics_alerts';
import { SyntheticsRuleTypeAlertDefinition, updateState } from '../common';
import { ALERT_DETAILS_URL, getActionVariables } from '../action_variables';
import type { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

type TLSActionGroups = ActionGroupIdsOf<typeof TLS_CERTIFICATE>;
type TLSRuleTypeState = SyntheticsCommonState;
type TLSAlertState = ReturnType<typeof getCertSummary>;
type TLSAlertContext = AlertContext;
type TLSAlert = ObservabilityUptimeAlert & {
  'kibana.alert.first_checked_at': string;
  'kibana.alert.last_checked_at': string;
  'kibana.alert.is_triggered': boolean;
  'kibana.alert.meta'?: { [key: string]: unknown };
  'kibana.alert.first_triggered_at'?: string;
  'kibana.alert.last_triggered_at'?: string;
  'kibana.alert.last_resolved_at'?: string;
  'cert.summary': string;
  'cert.status': string;
  'cert.sha256': string;
  'cert.common_name': string;
  'cert.issuer': string;
  'cert.monitor_name': string;
  'cert.monitor_id': string;
  'cert.checked_at': string;
  'cert.monitor_type': string;
  'cert.location_id': string;
  'cert.location_name': string;
  'cert.config_id': string;
  'cert.reason': string;
  'cert.monitor_url'?: string;
  'cert.monitor_tags'?: string[];
  'cert.last_error_message'?: string;
  'cert.last_error_stack'?: string | null;
  'cert.labels'?: { [key: string]: string };
  'cert.host_name'?: string;
  'cert.service_name'?: string;
};

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

        const legacyState = updateState(ruleState, true);

        const alertId = cert.sha256;
        const { uuid } = alertsClient.report({
          id: alertId,
          actionGroup: TLS_CERTIFICATE.id,
          state: { ...legacyState, ...summary },
          payload: {
            // state
            'kibana.alert.meta': legacyState.meta,
            'kibana.alert.first_checked_at': legacyState.firstCheckedAt,
            'kibana.alert.first_triggered_at': legacyState.firstTriggeredAt,
            'kibana.alert.is_triggered': legacyState.isTriggered,
            'kibana.alert.last_triggered_at': legacyState.lastTriggeredAt,
            'kibana.alert.last_checked_at': legacyState.lastCheckedAt,
            'kibana.alert.last_resolved_at': legacyState.lastResolvedAt,
            // summary
            'cert.summary': summary.summary,
            'cert.status': summary.status,
            'cert.sha256': summary.sha256,
            'cert.common_name': summary.commonName,
            'cert.issuer': summary.issuer,
            'cert.monitor_name': summary.monitorName,
            'cert.monitor_id': summary.configId,
            'cert.service_name': summary.serviceName,
            'cert.monitor_type': summary.monitorType,
            'cert.location_id': summary.locationId,
            'cert.location_name': summary.locationName,
            'cert.monitor_url': summary.monitorUrl,
            'cert.config_id': summary.configId,
            'cert.monitor_tags': summary.monitorTags,
            'cert.last_error_message': summary.lastErrorMessage,
            'cert.last_error_stack': summary.lastErrorStack,
            'cert.labels': summary.labels,
            'cert.reason': summary.reason,
            'cert.host_name': summary.hostName,
            'cert.checked_at': summary.checkedAt,
          },
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
