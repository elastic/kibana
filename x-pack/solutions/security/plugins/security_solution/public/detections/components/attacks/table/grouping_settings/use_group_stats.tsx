/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { GroupStatsItem, NamedAggregation, RawBucket } from '@kbn/grouping';
import { i18n } from '@kbn/i18n';

import { dsl } from '../../utils/dsl';
import type { AlertsGroupingAggregation } from '../../../alerts_table/grouping_settings/types';
import type { AttackForGroup } from '../../../../hooks/attacks/use_attack_group_handler';

const STATS_GROUP_ALERTS = i18n.translate(
  'xpack.securitySolution.attacks.alertsTable.groups.stats.alertsCount',
  {
    defaultMessage: 'Alerts:',
  }
);

export interface UseGroupStatsProps {
  getAttack: AttackForGroup;
}

export const useGroupStats = ({ getAttack }: UseGroupStatsProps) => {
  const { euiTheme } = useEuiTheme();

  const groupStatsAggregations = useCallback((): NamedAggregation[] => {
    return [
      { latestTimestamp: { max: { field: '@timestamp' } } },
      { attacks: { filter: dsl.isAttack() } },
      { attackRelatedAlerts: { filter: dsl.isNotAttack() } },
    ];
  }, []);

  const groupStatsRenderer = useCallback(
    (selectedGroup: string, bucket: RawBucket<AlertsGroupingAggregation>): GroupStatsItem[] => {
      const attack = getAttack(selectedGroup, bucket);
      const totalAlerts = attack
        ? attack.alertIds.length
        : bucket.attackRelatedAlerts?.doc_count ?? 0;

      return [
        {
          title: STATS_GROUP_ALERTS,
          badge: {
            value: totalAlerts,
            width: 50,
            color: euiTheme.colors.danger,
          },
        },
      ];
    },
    [euiTheme.colors.danger, getAttack]
  );

  return {
    aggregations: groupStatsAggregations,
    renderer: groupStatsRenderer,
  };
};
