/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupStatsItem, RawBucket } from '@kbn/grouping';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { RELATED_INTEGRATION } from '../../../constants';
import { IntegrationIcon as Icon } from '../common/integration_icon';
import { useTableSectionContext } from './table_section_context';
import { getRulesBadge, getSeverityComponent } from '../../alerts_table/grouping_settings';
import { DEFAULT_GROUP_STATS_RENDERER } from '../../alerts_table/alerts_grouping';
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';

const STATS_GROUP_SIGNAL_RULE_ID = i18n.translate(
  'xpack.securitySolution.alertSummary.groups.integrations',
  {
    defaultMessage: 'Integrations:',
  }
);
const STATS_GROUP_SIGNAL_RULE_ID_MULTI = i18n.translate(
  'xpack.securitySolution.alertSummary.groups.integrations.multi',
  {
    defaultMessage: ' Multi',
  }
);

export const TABLE_GROUP_STATS_TEST_ID = 'ease-alert-table-group-stats';

interface IntegrationProps {
  /**
   * Name of the integration to render the icon for.
   */
  integrationName: string;
}

/**
 * Renders the icon for the integration that matches the integration name.
 * In EASE, we can retrieve the integration/package via the kibana.rule.parameters field on the alert.
 */
export const IntegrationIcon = memo(({ integrationName }: IntegrationProps) => {
  const { packages } = useTableSectionContext();
  const integration = packages.find((p) => integrationName === p.name);

  return <Icon data-test-subj={TABLE_GROUP_STATS_TEST_ID} integration={integration} />;
});

IntegrationIcon.displayName = 'IntegrationIcon';

/**
 * Return a renderer for integration aggregation.
 */
export const getIntegrationComponent = (
  bucket: RawBucket<AlertsGroupingAggregation>
): GroupStatsItem[] => {
  const integrationNames = bucket.relatedIntegrationSubAggregation?.buckets;

  if (!integrationNames || integrationNames.length === 0) {
    return [];
  }

  if (integrationNames.length === 1) {
    const integrationName = Array.isArray(integrationNames[0].key)
      ? integrationNames[0].key[0]
      : integrationNames[0].key;
    return [
      {
        title: STATS_GROUP_SIGNAL_RULE_ID,
        component: <IntegrationIcon integrationName={integrationName} />,
      },
    ];
  }

  return [
    {
      title: STATS_GROUP_SIGNAL_RULE_ID,
      component: <>{STATS_GROUP_SIGNAL_RULE_ID_MULTI}</>,
    },
  ];
};

/**
 * Returns stats to be used in the`extraAction` property of the EuiAccordion component used within the kbn-grouping package.
 * It handles custom renders for the following fields:
 * - relatedIntegration (a runTime field we're creating and using in the adhoc dataView)
 * - kibana.alert.severity
 * - kibana.alert.rule.name
 * And returns a default view for all the other fields.
 *
 * These go hand in hand with groupingOptions, groupTitleRenderers and groupStatsAggregations.
 */
export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
): GroupStatsItem[] => {
  const defaultBadges: GroupStatsItem[] = DEFAULT_GROUP_STATS_RENDERER(selectedGroup, bucket);
  const severityComponent: GroupStatsItem[] = getSeverityComponent(bucket);
  const integrationComponent: GroupStatsItem[] = getIntegrationComponent(bucket);
  const rulesBadge: GroupStatsItem = getRulesBadge(bucket);

  switch (selectedGroup) {
    case RELATED_INTEGRATION:
      return [...severityComponent, rulesBadge, ...defaultBadges];
    case 'kibana.alert.severity':
      return [...integrationComponent, rulesBadge, ...defaultBadges];
    case 'kibana.alert.rule.name':
      return [...integrationComponent, ...severityComponent, ...defaultBadges];
    default:
      return [...integrationComponent, ...severityComponent, rulesBadge, ...defaultBadges];
  }
};
