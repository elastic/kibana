/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { GroupStatsItem, NamedAggregation, RawBucket } from '@kbn/grouping';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { i18n } from '@kbn/i18n';

import type { AlertsGroupingAggregation } from '../../../alerts_table/grouping_settings/types';

const STATS_GROUP_ALERTS = i18n.translate(
  'xpack.securitySolution.attacks.alertsTable.groups.stats.alertsCount',
  {
    defaultMessage: 'Alerts:',
  }
);

const dsl = {
  isAttack(): QueryDslQueryContainer {
    return { term: { 'kibana.alert.rule.rule_type_id': ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } };
  },
  isNotAttack(): QueryDslQueryContainer {
    return { bool: { must_not: dsl.isAttack() } };
  },
};

export const useGroupStats = () => {
  const { euiTheme } = useEuiTheme();

  const groupStatsAggregations = useCallback((): NamedAggregation[] => {
    return [
      { latestTimestamp: { max: { field: '@timestamp' } } },
      { attacks: { filter: dsl.isAttack() } },
      { attackRelatedAlerts: { filter: dsl.isNotAttack() } },
    ];
  }, []);

  const groupStatsRenderer = useCallback(
    (_: string, bucket: RawBucket<AlertsGroupingAggregation>): GroupStatsItem[] => {
      return [
        {
          title: STATS_GROUP_ALERTS,
          badge: {
            value: bucket.attackRelatedAlerts?.doc_count ?? 0,
            width: 50,
            color: euiTheme.colors.danger,
          },
        },
      ];
    },
    [euiTheme.colors.danger]
  );

  return {
    aggregations: groupStatsAggregations,
    renderer: groupStatsRenderer,
  };
};
