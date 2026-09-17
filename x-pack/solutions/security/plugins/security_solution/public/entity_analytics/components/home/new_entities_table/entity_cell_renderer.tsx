/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { capitalize } from 'lodash';
import moment from 'moment';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getSeverityColor } from '../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../entity_store/entity_icon_by_type';
import { RiskScoreCell } from '../entities_table/risk_score_cell';
import { AssetCriticalityBadge } from '../../asset_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import {
  EntitySourceValue,
  toEntitySourceArray,
} from '../../../../flyout/entity_details/shared/components/entity_source_value';

export const renderEntityCell = (
  columnId: string,
  value: unknown,
  row: Record<string, unknown>,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed
): JSX.Element => {
  if (value == null) return <>{'—'}</>;

  if (
    columnId === 'last_seen_alert' ||
    columnId === '@timestamp' ||
    columnId === 'entity.lifecycle.first_seen'
  ) {
    const m = moment(value as string);
    return <>{m.isValid() ? m.fromNow() : String(value)}</>;
  }

  if (columnId === 'entity.EngineMetadata.Type') {
    const entityType = value as EntityType;
    const iconType = EntityIconByType[entityType];
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {iconType && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="s">{capitalize(entityType)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (columnId === 'entity.risk.calculated_score_norm')
    return <RiskScoreCell riskScore={value as number} />;

  if (columnId === 'risk_score_change') {
    const delta = value as number;
    if (delta === 0) return <EuiTextColor color="subdued">{'—'}</EuiTextColor>;
    const worse = delta > 0;
    return (
      <EuiText size="s">
        <EuiTextColor color={worse ? 'danger' : 'success'}>
          <EuiIcon type={worse ? 'sortUp' : 'sortDown'} size="s" aria-hidden={true} />
          {` ${Math.abs(Math.round(delta))}%`}
        </EuiTextColor>
      </EuiText>
    );
  }

  if (columnId === 'alert_count') {
    const alertCount = value as number;
    if (alertCount === 0) return <>{'—'}</>;
    const severities = [
      {
        key: 'Critical',
        count: (row.alert_critical as number) ?? 0,
        color: getSeverityColor('critical', euiTheme),
      },
      {
        key: 'High',
        count: (row.alert_high as number) ?? 0,
        color: getSeverityColor('high', euiTheme),
      },
      {
        key: 'Medium',
        count: (row.alert_medium as number) ?? 0,
        color: getSeverityColor('medium', euiTheme),
      },
      {
        key: 'Low',
        count: (row.alert_low as number) ?? 0,
        color: getSeverityColor('low', euiTheme),
      },
    ].filter((s) => s.count > 0);
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <DistributionBar stats={severities} hideLastTooltip />
        </EuiFlexItem>
        <EuiBadge color="hollow">{alertCount}</EuiBadge>
      </EuiFlexGroup>
    );
  }

  if (columnId === 'case_count') return (value as number) === 0 ? <>{'—'}</> : <>{String(value)}</>;

  if (columnId === 'entity.attributes.watchlists') {
    const ids = value as string[];
    if (!Array.isArray(ids) || ids.length === 0) return <>{'—'}</>;
    const names = ids.map((id) => watchlistNames.get(id) ?? id);
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>{names[0]}</EuiFlexItem>
        {names.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiBadge>{`+${names.length - 1}`}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  if (columnId === 'asset.criticality')
    return (
      <AssetCriticalityBadge
        criticalityLevel={(value as CriticalityLevelWithUnassigned) ?? 'unassigned'}
      />
    );

  if (columnId === 'entity.source')
    return <EntitySourceValue values={toEntitySourceArray(value)} textSize="s" />;

  if (columnId === 'entity.relationships.resolution.resolved_to')
    return <EuiText size="s">{String(value)}</EuiText>;

  return <>{String(value)}</>;
};
