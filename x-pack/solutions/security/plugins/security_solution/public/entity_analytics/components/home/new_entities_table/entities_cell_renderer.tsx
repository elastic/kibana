/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { assertNever } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import moment from 'moment';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiTextColor,
  EuiTextTruncate,
  EuiToolTip,
} from '@elastic/eui';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getSeverityColor } from '../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { isGridColumnId, type GridColumnId } from './columns/registry';
import { EntityIconByType } from '../../entity_store/entity_icon_by_type';
import { RiskScoreCell } from '../entities_table/risk_score_cell';
import { AssetCriticalityBadge } from '../../asset_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import {
  EntitySourceValue,
  TruncatedBadgeList,
  toEntitySourceArray,
} from '../../../../flyout/entity_details/shared/components/entity_source_value';

const WATCHLISTS_OVERFLOW_TOOLTIP_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

const i18nStrings = {
  investigateInTimeline: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.investigateInTimelineTooltip',
    { defaultMessage: 'Investigate in timeline' }
  ),
  openEntityGraph: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.openEntityGraphTooltip',
    { defaultMessage: 'Open entity graph' }
  ),
  moreActions: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.moreActionsTooltip',
    { defaultMessage: 'More actions' }
  ),
  addToChat: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.rowActions.addToChatLabel',
    { defaultMessage: 'Add to chat' }
  ),
  openAlerts: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.alertCount.openAlertsAriaLabel',
    { defaultMessage: 'Open alerts' }
  ),
};

const cellTruncateCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

const DefaultCell: React.FC<{ value: unknown }> = ({ value }) => {
  const text = Array.isArray(value) ? value.map((v) => String(v)).join(', ') : String(value ?? '—');
  return (
    <div
      css={css`
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      `}
    >
      {text}
    </div>
  );
};

interface RowActionsCellProps {
  onInvestigateInTimeline: () => void;
  onOpenEntityGraph: () => void;
}

const RowActionsCell: React.FC<RowActionsCellProps> = ({
  onInvestigateInTimeline,
  onOpenEntityGraph,
}) => {
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18nStrings.investigateInTimeline} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="timeline"
            aria-label={i18nStrings.investigateInTimeline}
            color="text"
            size="xs"
            onClick={onInvestigateInTimeline}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18nStrings.openEntityGraph} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cluster"
            aria-label={i18nStrings.openEntityGraph}
            color="text"
            size="xs"
            onClick={onOpenEntityGraph}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18nStrings.moreActions}
          button={
            <EuiToolTip content={i18nStrings.moreActions} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="boxesVertical"
                aria-label={i18nStrings.moreActions}
                color="text"
                size="xs"
                onClick={() => setIsMoreActionsOpen((prev) => !prev)}
              />
            </EuiToolTip>
          }
          isOpen={isMoreActionsOpen}
          closePopover={() => setIsMoreActionsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem disabled key="addToChat">
                {i18nStrings.addToChat}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { RowActionsCell };

export interface RowActions {
  onInvestigateInTimeline: (row: Record<string, unknown>) => void;
  onOpenEntityGraph: (row: Record<string, unknown>) => void;
}

export interface CellHandlers {
  onEntityNameClick?: (row: Record<string, unknown>) => void;
  onGroupSizeClick?: (row: Record<string, unknown>) => void;
  onAlertCountClick?: (row: Record<string, unknown>) => void;
  onAnomalyCountClick?: (row: Record<string, unknown>) => void;
}

export const renderEntityCell = (
  columnId: GridColumnId,
  value: unknown,
  row: Record<string, unknown>,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed,
  handlers?: CellHandlers
): JSX.Element => {
  const { onEntityNameClick, onGroupSizeClick, onAlertCountClick, onAnomalyCountClick } =
    handlers ?? {};

  switch (columnId) {
    case 'entity.name': {
      const name = String(value ?? '—');
      if (!onEntityNameClick) {
        return (
          <div
            css={css`
              overflow: hidden;
              min-width: 0;
              width: 100%;
            `}
          >
            <EuiTextTruncate text={name} />
          </div>
        );
      }
      // Link wraps truncation (not the reverse): EuiTextTruncate aria-hides truncated text,
      // so a nested link would be focusable but unreachable to screen readers.
      return (
        <div
          css={css`
            overflow: hidden;
            min-width: 0;
            width: 100%;
          `}
        >
          <EuiLink
            onClick={() => onEntityNameClick(row)}
            css={css`
              display: block;
              width: 100%;
              min-width: 0;
            `}
          >
            <EuiTextTruncate text={name} />
          </EuiLink>
        </div>
      );
    }

    case 'group_size':
      return onGroupSizeClick ? (
        <div
          css={css`
            display: flex;
            overflow: hidden;
          `}
        >
          <EuiLink onClick={() => onGroupSizeClick(row)} css={cellTruncateCss}>
            {String(value ?? '—')}
          </EuiLink>
        </div>
      ) : (
        <DefaultCell value={value} />
      );

    case 'last_seen_alert':
    case '@timestamp':
    case 'entity.lifecycle.first_seen': {
      if (value == null) return <>{'—'}</>;
      const m = moment(value as string);
      return <>{m.isValid() ? m.fromNow() : String(value)}</>;
    }

    case 'entity.EngineMetadata.Type': {
      if (value == null) return <>{'—'}</>;
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

    case 'entity.risk.calculated_score_norm':
      return value == null ? <>{'—'}</> : <RiskScoreCell riskScore={value as number} />;

    case 'risk_score_change': {
      if (value == null) return <>{'—'}</>;
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

    case 'alert_count': {
      if (value == null) return <>{'—'}</>;
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
          <EuiFlexItem style={{ pointerEvents: 'none' }}>
            <DistributionBar stats={severities} hideLastTooltip />
          </EuiFlexItem>
          {onAlertCountClick ? (
            <EuiBadge
              color="hollow"
              onClick={() => onAlertCountClick(row)}
              onClickAriaLabel={i18nStrings.openAlerts}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {alertCount}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">{alertCount}</EuiBadge>
          )}
        </EuiFlexGroup>
      );
    }

    case 'anomaly_count': {
      if (value == null) return <>{'—'}</>;
      const anomalyCount = value as number;
      if (anomalyCount === 0) return <>{'—'}</>;
      return onAnomalyCountClick ? (
        <EuiLink
          onClick={() => onAnomalyCountClick(row)}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {anomalyCount}
        </EuiLink>
      ) : (
        <>{String(anomalyCount)}</>
      );
    }

    case 'case_count':
      return value == null || (value as number) === 0 ? <>{'—'}</> : <>{String(value)}</>;

    case 'entity.attributes.watchlists': {
      const names = toEntitySourceArray(value).map((id) => watchlistNames.get(id) ?? id);
      return (
        <TruncatedBadgeList
          values={names}
          overflowTooltipTitle={WATCHLISTS_OVERFLOW_TOOLTIP_TITLE}
          textSize="s"
          data-test-subj="entityWatchlistsValue"
        />
      );
    }

    case 'asset.criticality':
      return (
        <AssetCriticalityBadge
          criticalityLevel={(value as CriticalityLevelWithUnassigned) ?? 'unassigned'}
        />
      );

    case 'entity.source':
      return <EntitySourceValue values={toEntitySourceArray(value)} textSize="s" />;

    case 'entity.relationships.resolution.resolved_to':
      return <DefaultCell value={value} />;
  }

  return assertNever(columnId);
};

export const renderGridCell = (
  columnId: string,
  value: unknown,
  row: Record<string, unknown>,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed,
  handlers?: CellHandlers
): JSX.Element => {
  if (!isGridColumnId(columnId)) {
    return <DefaultCell value={value} />;
  }
  return renderEntityCell(columnId, value, row, watchlistNames, euiTheme, handlers);
};
