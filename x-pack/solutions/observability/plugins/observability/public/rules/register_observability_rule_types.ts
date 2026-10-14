/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityPublicPluginsStart } from '../plugin';
import type {
  CustomMetricExpressionParams,
  CustomThresholdSearchSourceFields,
} from '../../common/custom_threshold_rule/types';
import type { ObservabilityRuleTypeRegistry } from './create_observability_rule_type_registry';
import { validateCustomThreshold } from '../components/custom_threshold/components/validation';
import { getDescriptionFields } from './custom_threshold_description_fields';
import { createCustomThresholdRuleExpression } from '../components/custom_threshold/custom_threshold_rule_expression_factory';
import { formatCustomThresholdAlert } from './format_custom_threshold_alert';

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
    defaultMessage: `Recovered: '{{context.reason}}'
    
    '{{rule.name}}' has recovered.

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);

export const registerObservabilityRuleTypes = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  uiSettings: IUiSettingsClient,
  getStartServices: () => Promise<[CoreStart, ObservabilityPublicPluginsStart, unknown]>,
  logsLocator?: LocatorPublic<DiscoverAppLocatorParams>
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
    ruleParamsExpression: createCustomThresholdRuleExpression(getStartServices),
    validate: validateCustomThresholdWithUiSettings,
    defaultActionMessage: thresholdDefaultActionMessage,
    defaultRecoveryMessage: thresholdDefaultRecoveryMessage,
    requiresAppContext: false,
    format: ({ fields }) => formatCustomThresholdAlert(fields, logsLocator),
    alertDetailsAppSection: lazy(
      () =>
        import(
          '../components/custom_threshold/components/alert_details_app_section/alert_details_app_section'
        )
    ),
    priority: 110,
    getDescriptionFields,
  });
};
