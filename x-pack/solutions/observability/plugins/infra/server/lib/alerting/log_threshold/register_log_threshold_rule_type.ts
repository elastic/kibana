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
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { logThresholdParamsSchema } from '@kbn/response-ops-rule-params/log_threshold';
import type { InfraConfig } from '../../../../common/plugin_config_types';
import { O11Y_AAD_FIELDS } from '../../../../common/constants';
import { createLogThresholdExecutor, FIRED_ACTIONS } from './log_threshold_executor';
import { extractReferences, injectReferences } from './log_threshold_references_manager';
import { LOG_DOCUMENT_COUNT_RULE_TYPE_ID } from '../../../../common/alerting/logs/log_threshold';
import type { InfraBackendLibs } from '../../infra_types';
import {
  alertDetailUrlActionVariableDescription,
  groupByKeysActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
  hostActionVariableDescription,
  labelsActionVariableDescription,
  orchestratorActionVariableDescription,
  tagsActionVariableDescription,
} from '../common/messages';
import { LogsRulesTypeAlertDefinition } from '../register_rule_types';

const timestampActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.timestampActionVariableDescription',
  {
    defaultMessage: 'UTC timestamp of when the alert was triggered',
  }
);

const documentCountActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.documentCountActionVariableDescription',
  {
    defaultMessage: 'The number of log entries that matched the conditions provided',
  }
);

const conditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.conditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that log entries needed to fulfill',
  }
);

const groupByActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.groupByActionVariableDescription',
  {
    defaultMessage:
      'The name of the group(s) responsible for triggering the alert. For accessing each group key, use context.groupByKeys.',
  }
);

const isRatioActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.isRatioActionVariableDescription',
  {
    defaultMessage: 'Denotes whether this alert was configured with a ratio',
  }
);

const ratioActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.ratioActionVariableDescription',
  {
    defaultMessage: 'The ratio value of the two sets of criteria',
  }
);

const numeratorConditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.numeratorConditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that the numerator of the ratio needed to fulfill',
  }
);

const denominatorConditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.denominatorConditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that the denominator of the ratio needed to fulfill',
  }
);

const alertReasonMessageActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.alertReasonMessageActionVariableDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);

const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.viewInAppUrlActionVariableDescription',
  {
    defaultMessage: 'Link to the alert source',
  }
);

export function registerLogThresholdRuleType(
  alertingPlugin: AlertingServerSetup,
  libs: InfraBackendLibs,
  { featureFlags }: InfraConfig
) {
  if (!featureFlags.logThresholdAlertRuleEnabled) {
    return;
  }

  if (!alertingPlugin) {
    throw new Error(
      'Cannot register log threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }

  alertingPlugin.registerType({
    id: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
    name: i18n.translate('xpack.infra.logs.alertName', {
      defaultMessage: 'Log threshold',
    }),
    validate: {
      params: logThresholdParamsSchema,
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createLogThresholdExecutor(libs),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'matchingDocuments', description: documentCountActionVariableDescription },
        { name: 'conditions', description: conditionsActionVariableDescription },
        { name: 'group', description: groupByActionVariableDescription },
        { name: 'groupByKeys', description: groupByKeysActionVariableDescription },
        // Ratio alerts
        { name: 'isRatio', description: isRatioActionVariableDescription },
        { name: 'reason', description: alertReasonMessageActionVariableDescription },
        { name: 'ratio', description: ratioActionVariableDescription },
        { name: 'numeratorConditions', description: numeratorConditionsActionVariableDescription },
        {
          name: 'denominatorConditions',
          description: denominatorConditionsActionVariableDescription,
        },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
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
      ],
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'logs',
    useSavedObjectReferences: {
      extractReferences,
      injectReferences,
    },
    alerts: LogsRulesTypeAlertDefinition,
    fieldsForAAD: O11Y_AAD_FIELDS,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
}
