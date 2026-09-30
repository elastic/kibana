/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * v.8 resolution-group stats: the shared Entities + Risk score (with change
 * beside the badge), then Asset criticality, Alerts (count badge), Anomalies,
 * and Cases.
 */

import React from 'react';
import { EuiHealth, EuiIcon, EuiText, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GroupStatsItem, RawBucket } from '@kbn/grouping';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { CRITICALITY_LEVEL_TITLE } from '../../../asset_criticality/translations';
import { getCriticalityLevelColor } from '../../../asset_criticality';
import { createGroupStatsRenderer } from '../../entities_table/grouping/entity_group_renderer';
import { ENTITY_GROUPING_OPTIONS } from '../../entities_table/constants';
import type {
  EntitiesGroupingAggregation,
  TargetMetadataMap,
} from '../../entities_table/grouping/use_fetch_grouped_data';
import type { FaceliftTargetMetadataMap } from './entities_table_grouping';

const assetCriticalityLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.stat.assetCriticality',
  { defaultMessage: 'Asset criticality:' }
);

const alertsLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.stat.alerts',
  { defaultMessage: 'Alerts:' }
);

const anomaliesLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.stat.anomalies',
  { defaultMessage: 'Anomalies:' }
);

const casesLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.group.stat.cases',
  { defaultMessage: 'Cases:' }
);

const GroupRiskChange = ({ percent }: { percent: number }) => {
  if (percent === 0) {
    return (
      <EuiText size="xs">
        <EuiTextColor color="subdued">{'—'}</EuiTextColor>
      </EuiText>
    );
  }

  const worse = percent > 0;
  return (
    <EuiText size="xs">
      <EuiTextColor color={worse ? 'danger' : 'success'}>
        <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
        {` ${Math.abs(percent)}%`}
      </EuiTextColor>
    </EuiText>
  );
};

/**
 * Same slot as the grouping badges: title text, then an inline 16px value.
 * The grouping span inherits a ~29px line-height; pin it to 16px so the label
 * and EuiHealth share one line.
 */
const GroupAssetCriticality = ({
  criticality,
}: {
  criticality: CriticalityLevelWithUnassigned;
}) => {
  const { euiTheme } = useEuiTheme();

  const alignWithLabel = (node: HTMLSpanElement | null) => {
    const parent = node?.parentElement;
    if (!parent) {
      return;
    }
    parent.style.display = 'inline-flex';
    parent.style.alignItems = 'center';
    parent.style.height = '16px';
    parent.style.lineHeight = '16px';
    parent.style.whiteSpace = 'nowrap';
  };

  return (
    <span
      ref={alignWithLabel}
      css={css`
        display: contents;
      `}
    >
      <EuiHealth
        color={getCriticalityLevelColor(euiTheme, criticality)}
        textSize="xs"
        data-test-subj="asset-criticality-badge"
        css={css`
          display: inline-flex;
          align-items: center;
          height: 16px;
          line-height: 16px;
          margin-left: 10px;

          .euiFlexGroup {
            display: inline-flex;
            align-items: center;
            height: 16px;
            line-height: 16px;
            margin: 0;
          }
        `}
      >
        {CRITICALITY_LEVEL_TITLE[criticality]}
      </EuiHealth>
    </span>
  );
};

export const createFaceliftGroupStatsRenderer = (targetMetadata: FaceliftTargetMetadataMap) => {
  const baseRenderer = createGroupStatsRenderer(targetMetadata as TargetMetadataMap);

  return (
    selectedGroup: string,
    bucket: RawBucket<EntitiesGroupingAggregation>
  ): GroupStatsItem[] => {
    const stats = baseRenderer(selectedGroup, bucket);
    if (selectedGroup !== ENTITY_GROUPING_OPTIONS.RESOLUTION) {
      return stats;
    }

    const entityId = String(bucket.key_as_string ?? bucket.key);
    const metadata = targetMetadata.get(entityId);
    if (!metadata) {
      return stats;
    }

    const riskScoreStat = stats.find((stat) => stat.component != null && stat.badge == null);
    if (riskScoreStat) {
      riskScoreStat.component = (
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            gap: 8px;
          `}
        >
          {riskScoreStat.component}
          <GroupRiskChange percent={metadata.riskChangePercent} />
        </span>
      );
    }

    stats.push(
      {
        title: assetCriticalityLabel,
        component: <GroupAssetCriticality criticality={metadata.criticality} />,
      },
      {
        title: alertsLabel,
        badge: { value: metadata.alerts, width: 50 },
      },
      {
        title: anomaliesLabel,
        badge: { value: metadata.anomalies, width: 50 },
      },
      {
        title: casesLabel,
        badge: { value: metadata.cases, width: 50 },
      }
    );

    return stats;
  };
};
