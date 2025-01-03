/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  ALERT_START,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type {
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
  CustomThresholdSearchSourceFields,
  SearchConfigurationWithExtractedReferenceType,
} from '../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../components/custom_threshold/types';
import { getViewInAppUrl } from '../../common/custom_threshold_rule/get_view_in_app_url';
import { getGroups } from '../../common/custom_threshold_rule/helpers/get_group';
import { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
import { validateCustomThreshold } from '../components/custom_threshold/components/validation';

const thresholdDefaultActionMessage = i18n.translate(
  'xpack.observability.customThreshold.rule.alerting.threshold.defaultActionMessage',
  {
    defaultMessage: `'{{context.reason}}'

'{{rule.name}}' is active.

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);
const thresholdDefaultRecoveryMessage = i18n.translate(
  'xpack.observability.customThreshold.rule.alerting.threshold.defaultRecoveryMessage',
  {
    defaultMessage: `'{{rule.name}}' has recovered.

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);

const getDataViewId = (searchConfiguration?: SearchConfigurationWithExtractedReferenceType) =>
  typeof searchConfiguration?.index === 'string'
    ? searchConfiguration.index
    : searchConfiguration?.index?.title;

export const registerObservabilityRuleTypes = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  uiSettings: IUiSettingsClient,
  logsExplorerLocator?: LocatorPublic<LogsExplorerLocatorParams>
) => {
  const validateCustomThresholdWithUiSettings = ({
    criteria,
    searchConfiguration,
  }: {
    criteria: CustomMetricExpressionParams[];
    searchConfiguration: CustomThresholdSearchSourceFields;
  }) => validateCustomThreshold({ criteria, searchConfiguration, uiSettings });
  observabilityRuleTypeRegistry.register({
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    description: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.alertDescription',
      {
        defaultMessage: 'Alert when any Observability data type reaches or exceeds a given value.',
      }
    ),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.customThreshold}`;
    },
    ruleParamsExpression: lazy(
      () => import('../components/custom_threshold/custom_threshold_rule_expression')
    ),
    validate: validateCustomThresholdWithUiSettings,
    defaultActionMessage: thresholdDefaultActionMessage,
    defaultRecoveryMessage: thresholdDefaultRecoveryMessage,
    requiresAppContext: false,
    format: ({ fields }) => {
      const groups = getGroups(fields[ALERT_GROUP_FIELD], fields[ALERT_GROUP_VALUE]);
      const searchConfiguration = fields[ALERT_RULE_PARAMETERS]?.searchConfiguration as
        | SearchConfigurationWithExtractedReferenceType
        | undefined;
      const criteria = fields[ALERT_RULE_PARAMETERS]?.criteria as MetricExpression[];
      const metrics: CustomThresholdExpressionMetric[] =
        criteria.length === 1 ? criteria[0].metrics : [];

      const dataViewId = getDataViewId(searchConfiguration);
      return {
        reason: fields[ALERT_REASON] ?? '-',
        link: getViewInAppUrl({
          dataViewId,
          groups,
          logsExplorerLocator,
          metrics,
          searchConfiguration,
          startedAt: fields[ALERT_START],
        }),
        hasBasePath: true,
      };
    },
    alertDetailsAppSection: lazy(
      () =>
        import(
          '../components/custom_threshold/components/alert_details_app_section/alert_details_app_section'
        )
    ),
    priority: 110,
  });
};
