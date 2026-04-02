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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GroupStatsItem, RawBucket } from '@kbn/grouping';
import { capitalize } from 'lodash';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../../flyout/entity_details/shared/constants';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { getRiskLevel } from '../../../../../../common/entity_analytics/risk_engine';
import { formatRiskScore } from '../../../../common/utils';
import { getRiskScoreColors } from '../risk_score_cell';
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

  const targetEntityName = bucket.resolutionEntityName?.name?.buckets?.[0]?.key;
  const displayName = targetEntityName ?? String(bucket.key_as_string ?? bucket.key);

  const entityType = bucket.resolutionEntityType?.type?.buckets?.[0]?.key as EntityType | undefined;

  const canOpenFlyout = Boolean(targetEntityName && entityType);

  const handleOpenFlyout = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!targetEntityName || !entityType) return;

      const panelKey = EntityPanelKeyByType[entityType];
      const panelParam = EntityPanelParamByType[entityType];
      if (!panelKey || !panelParam) return;

      openRightPanel({
        id: panelKey,
        params: {
          [panelParam]: targetEntityName,
          contextID: ENTITY_ANALYTICS_TABLE_ID,
          scopeId: ENTITY_ANALYTICS_TABLE_ID,
        },
      });
    },
    [openRightPanel, targetEntityName, entityType]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {canOpenFlyout && (
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
        <EuiText size="s">{displayName}</EuiText>
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
    const entityType = capitalize(bucket.key_as_string ?? bucket.key.toString());
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">{entityType}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return undefined;
};

const GroupRiskScoreBadge = ({ riskScore }: { riskScore: number | null | undefined }) => {
  const { euiTheme } = useEuiTheme();

  const badgeCss = css`
    margin-left: ${euiTheme.size.s};
    width: 55px;
  `;

  if (riskScore == null) {
    return (
      <EuiBadge css={badgeCss} color="hollow">
        {getEmptyValue()}
      </EuiBadge>
    );
  }

  const riskLevel = getRiskLevel(riskScore);
  const colors = getRiskScoreColors(euiTheme, riskLevel);

  return (
    <EuiBadge css={badgeCss} color={colors.background}>
      <EuiText
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        size="xs"
        color={colors.text}
      >
        {formatRiskScore(riskScore)}
      </EuiText>
    </EuiBadge>
  );
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
    stats.push({
      title: riskScoreLabel,
      component: <GroupRiskScoreBadge riskScore={bucket.resolutionRiskScore?.value} />,
    });
  }

  return stats;
};
