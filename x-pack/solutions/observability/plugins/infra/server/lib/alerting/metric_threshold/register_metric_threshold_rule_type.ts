/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type {
  GetViewInAppRelativeUrlFnOpts,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import { observabilityFeatureId, observabilityPaths } from '@kbn/observability-plugin/common';
import { metricThresholdRuleParamsSchema } from '@kbn/response-ops-rule-params/metric_threshold';

import type { InfraConfig } from '../../../../common/plugin_config_types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import type { InfraBackendLibs, InfraLocators } from '../../infra_types';
import {
  alertDetailUrlActionVariableDescription,
  alertStateActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
  groupByKeysActionVariableDescription,
  hostActionVariableDescription,
  labelsActionVariableDescription,
  metricActionVariableDescription,
  orchestratorActionVariableDescription,
  originalAlertStateActionVariableDescription,
  originalAlertStateWasActionVariableDescription,
  reasonActionVariableDescription,
  tagsActionVariableDescription,
  thresholdActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  viewInAppUrlActionVariableDescription,
} from '../common/messages';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
  NO_DATA_ACTIONS,
} from './metric_threshold_executor';
import { MetricsRulesTypeAlertDefinition } from '../register_rule_types';

export function registerMetricThresholdRuleType(
  alertingPlugin: AlertingServerSetup,
  libs: InfraBackendLibs,
  { featureFlags }: InfraConfig,
  locators: InfraLocators
) {
  if (!featureFlags.metricThresholdAlertRuleEnabled) {
    return;
  }

  const groupActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.groupActionVariableDescription',
    {
      defaultMessage:
        'Name of the group(s) reporting data. For accessing each group key, use context.groupByKeys.',
    }
  );

  alertingPlugin.registerType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.alertName', {
      defaultMessage: 'Metric threshold',
    }),
    validate: {
      params: metricThresholdRuleParamsSchema,
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS, NO_DATA_ACTIONS],
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createMetricThresholdExecutor(libs, locators),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'groupByKeys', description: groupByKeysActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'alertState', description: alertStateActionVariableDescription },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'metric', description: metricActionVariableDescription },
        { name: 'threshold', description: thresholdActionVariableDescription },
        {
          name: 'viewInAppUrl',
          description: viewInAppUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'cloud', description: cloudActionVariableDescription },
        { name: 'host', description: hostActionVariableDescription },
        { name: 'container', description: containerActionVariableDescription },
        { name: 'orchestrator', description: orchestratorActionVariableDescription },
        { name: 'labels', description: labelsActionVariableDescription },
        { name: 'tags', description: tagsActionVariableDescription },
        { name: 'originalAlertState', description: originalAlertStateActionVariableDescription },
        {
          name: 'originalAlertStateWasALERT',
          description: originalAlertStateWasActionVariableDescription,
        },
        {
          name: 'originalAlertStateWasWARNING',
          description: originalAlertStateWasActionVariableDescription,
        },
        {
          name: 'originalAlertStateWasNO_DATA',
          description: originalAlertStateWasActionVariableDescription,
        },
      ],
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'infrastructure',
    solution: observabilityFeatureId,
    alerts: MetricsRulesTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
