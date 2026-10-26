/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type {
  AssetDetailsLocatorParams,
  InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import type { InfraPublicConfig } from '../../../common/plugin_config_types';
import type { InventoryMetricConditions } from '../../../common/alerting/metrics';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../common/alerting/metrics';
import { validateMetricThreshold } from './components/validation';
import { getRuleFormat } from './rule_data_formatters';
import type { ExpressionsProps } from './components/expression';
import { getDescriptionFields } from '../common/get_description_fields/get_description_fields';

interface InventoryMetricRuleTypeParams extends RuleTypeParams {
  criteria: InventoryMetricConditions[];
}

const inventoryDefaultActionMessage = i18n.translate(
  'xpack.infra.metrics.alerting.inventory.threshold.defaultActionMessage',
  {
    defaultMessage: `'{{context.reason}}'

'{{rule.name}}' is active with the following conditions:

- Affected: '{{context.group}}'
- Metric: '{{context.metric}}'
- Observed value: '{{context.value}}'
- Threshold: '{{context.threshold}}'

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);
const inventoryDefaultRecoveryMessage = i18n.translate(
  'xpack.infra.metrics.alerting.inventory.threshold.defaultRecoveryMessage',
  {
    defaultMessage: `Recovered '{{context.reason}}'

    '{{rule.name}}' has recovered.

- Affected: '{{context.group}}'
- Metric: '{{context.metric}}'
- Threshold: '{{context.threshold}}'

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);

const LazyRuleParamsExpression = React.lazy(() => import('./components/expression'));

export function createInventoryMetricRuleType({
  assetDetailsLocator,
  inventoryLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  inventoryLocator?: LocatorPublic<InventoryLocatorParams>;
  config?: InfraPublicConfig;
}): ObservabilityRuleTypeModel<InventoryMetricRuleTypeParams> {
  const format = getRuleFormat({ assetDetailsLocator, inventoryLocator });

  return {
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.inventory.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the inventory exceeds a defined threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.infrastructureThreshold}`;
    },
    ruleParamsExpression: (props: ExpressionsProps) => (
      <React.Suspense fallback={null}>
        <LazyRuleParamsExpression {...props} />
      </React.Suspense>
    ),
    validate: validateMetricThreshold,
    defaultActionMessage: inventoryDefaultActionMessage,
    defaultRecoveryMessage: inventoryDefaultRecoveryMessage,
    requiresAppContext: false,
    format,
    priority: 20,
    getDescriptionFields,
  };
}
