/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  GetViewInAppRelativeUrlFnOpts,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import { observabilityFeatureId, observabilityPaths } from '@kbn/observability-plugin/common';
import { metricInventoryThresholdRuleParamsSchema } from '@kbn/response-ops-rule-params/metric_inventory_threshold';
import type { InfraConfig } from '../../../../common/plugin_config_types';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import type { InfraBackendLibs, InfraLocators } from '../../infra_types';
import {
  alertDetailUrlActionVariableDescription,
  alertStateActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
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
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
  WARNING_ACTIONS,
} from './inventory_metric_threshold_executor';
import { MetricsRulesTypeAlertDefinition } from '../register_rule_types';

const groupActionVariableDescription = i18n.translate(
  'xpack.infra.inventory.alerting.groupActionVariableDescription',
  {
    defaultMessage: 'Name of the group reporting data',
  }
);

export function registerInventoryThresholdRuleType(
  alertingPlugin: AlertingServerSetup,
  libs: InfraBackendLibs,
  { featureFlags }: InfraConfig,
  locators: InfraLocators
) {
  if (!featureFlags.inventoryThresholdAlertRuleEnabled) {
    return;
  }

  alertingPlugin.registerType({
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.inventory.alertName', {
      defaultMessage: 'Inventory',
    }),
    validate: {
      params: metricInventoryThresholdRuleParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema',
        schema: metricInventoryThresholdRuleParamsSchema,
      },
    },
    defaultActionGroupId: FIRED_ACTIONS_ID,
    doesSetRecoveryContext: true,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'infrastructure',
    solution: observabilityFeatureId,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    /*
     * The schema defined in response-ops-rule-params cannot import all types from the plugins
     * so the executor will expect slight differences with the type InventoryMetricThresholdParams.
     */
    // @ts-ignore
    executor: createInventoryMetricThresholdExecutor(libs, locators),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
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
      ],
    },
    alerts: MetricsRulesTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
