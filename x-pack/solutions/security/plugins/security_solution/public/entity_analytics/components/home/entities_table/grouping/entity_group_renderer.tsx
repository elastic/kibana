/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GroupStatsItem, RawBucket } from '@kbn/grouping';
import _ from 'lodash';
import type { EntitiesGroupingAggregation } from './use_fetch_grouped_data';
import { ENTITY_GROUPING_OPTIONS, TEST_SUBJ_GROUPING_COUNTER } from '../constants';

const entitiesStatLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.group.stat.entities',
  { defaultMessage: 'Entities' }
);

export const groupPanelRenderer = (
  selectedGroup: string,
  bucket: RawBucket<EntitiesGroupingAggregation>,
  _nullGroupMessage?: string
) => {
  if (selectedGroup === ENTITY_GROUPING_OPTIONS.ENTITY_TYPE) {
    const entityType = _.capitalize(bucket.key_as_string ?? bucket.key.toString());
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{entityType}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return undefined;
};

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<EntitiesGroupingAggregation>
): GroupStatsItem[] => {
  const stats: GroupStatsItem[] = [];

  if (bucket.doc_count) {
    stats.push({
      title: entitiesStatLabel,
      component: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.entitiesTable.group.stat.entitiesTooltip',
            {
              values: { count: bucket.doc_count },
              defaultMessage: '{count} entities',
            }
          )}
        >
          <EuiBadge data-test-subj={TEST_SUBJ_GROUPING_COUNTER}>{bucket.doc_count}</EuiBadge>
        </EuiToolTip>
      ),
    });
  }

  return stats;
};
