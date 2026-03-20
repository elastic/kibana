/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GroupStatsItem, RawBucket } from '@kbn/grouping';
import _ from 'lodash';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../../flyout/entity_details/shared/constants';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import type { EntitiesGroupingAggregation } from './use_fetch_grouped_data';
import { ENTITY_GROUPING_OPTIONS } from '../constants';

const entitiesStatLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.group.stat.entities',
  { defaultMessage: 'Entities:' }
);

const riskScoreLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.group.stat.riskScore',
  { defaultMessage: 'Risk score:' }
);

const openEntityFlyoutLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.group.openEntityFlyout',
  { defaultMessage: 'Open entity details' }
);

const ResolutionGroupPanel = ({ bucket }: { bucket: RawBucket<EntitiesGroupingAggregation> }) => {
  const { openRightPanel } = useExpandableFlyoutApi();

  const entityName =
    bucket.resolutionEntityName?.name?.buckets?.[0]?.key ??
    String(bucket.key_as_string ?? bucket.key);

  const entityType = bucket.resolutionEntityType?.type?.buckets?.[0]?.key as EntityType | undefined;

  const handleOpenFlyout = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!entityType) return;

      const panelKey = EntityPanelKeyByType[entityType];
      const panelParam = EntityPanelParamByType[entityType];
      if (!panelKey || !panelParam) return;

      openRightPanel({
        id: panelKey,
        params: {
          [panelParam]: entityName,
          contextID: ENTITY_ANALYTICS_TABLE_ID,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
        },
      });
    },
    [openRightPanel, entityName, entityType]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {entityType && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={openEntityFlyoutLabel}>
            <EuiButtonIcon
              aria-label={openEntityFlyoutLabel}
              iconType="expand"
              size="xs"
              onClick={handleOpenFlyout}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{entityName}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const groupPanelRenderer = (
  selectedGroup: string,
  bucket: RawBucket<EntitiesGroupingAggregation>,
  _nullGroupMessage?: string
) => {
  if (selectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION) {
    return <ResolutionGroupPanel bucket={bucket} />;
  }

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
      badge: {
        value: bucket.doc_count,
        width: 50,
      },
    });
  }

  if (selectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION) {
    const riskScore = bucket.resolutionRiskScore?.value;
    stats.push({
      title: riskScoreLabel,
      component: (
        <EuiBadge
          style={{ marginLeft: 10, width: 55 }}
          color={riskScore != null ? '#a83632' : 'hollow'}
        >
          {riskScore != null ? riskScore.toFixed(2) : '\u2013'}
        </EuiBadge>
      ),
    });
  }

  return stats;
};
