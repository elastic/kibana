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
import { EntityType } from '../../../../../common/entity_analytics/types';
import { ValidCriticalityLevels } from '../../../../../common/entity_analytics/asset_criticality/constants';
import { getNumber } from './common';
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

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.host]: i18n.translate('xpack.securitySolution.entityAnalytics.home.entityType.host', {
    defaultMessage: 'Host',
  }),
  [EntityType.user]: i18n.translate('xpack.securitySolution.entityAnalytics.home.entityType.user', {
    defaultMessage: 'User',
  }),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.entityType.service',
    { defaultMessage: 'Service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.entityType.generic',
    { defaultMessage: 'Generic' }
  ),
};

const ENTITY_TYPE_VALUES: readonly string[] = Object.values(EntityType);
const isEntityType = (value: unknown): value is EntityType =>
  typeof value === 'string' && ENTITY_TYPE_VALUES.includes(value);

const CRITICALITY_VALUES: readonly string[] = ValidCriticalityLevels;
const isCriticalityLevel = (value: unknown): value is CriticalityLevelWithUnassigned =>
  typeof value === 'string' && CRITICALITY_VALUES.includes(value);

/** Severity counts filled by the alerts enrich query, in display order. */
const ALERT_SEVERITIES = [
  {
    key: 'critical',
    field: 'alert_critical',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    key: 'high',
    field: 'alert_high',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.high', {
      defaultMessage: 'High',
    }),
  },
  {
    key: 'medium',
    field: 'alert_medium',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    key: 'low',
    field: 'alert_low',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.low', {
      defaultMessage: 'Low',
    }),
  },
] as const;

const noPointerEventsCss = css`
  pointer-events: none;
`;

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

const nameCellCss = css`
  overflow: hidden;
  min-width: 0;
  width: 100%;
`;

const EntityNameCell = ({
  value,
  row,
  onEntityNameClick,
}: {
  value: unknown;
  row: Record<string, unknown>;
  onEntityNameClick?: (row: Record<string, unknown>) => void;
}) => {
  const name = String(value ?? '—');
  if (!onEntityNameClick) {
    return (
      <div css={nameCellCss}>
        <EuiTextTruncate text={name} />
      </div>
    );
  }
  // Link wraps truncation (not the reverse): EuiTextTruncate aria-hides truncated text,
  // so a nested link would be focusable but unreachable to screen readers.
  return (
    <div css={nameCellCss}>
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
};

const EntityTypeCell = ({ value }: { value: unknown }) => {
  if (!isEntityType(value)) return <>{value == null ? '—' : String(value)}</>;
  const iconType = EntityIconByType[value];
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {iconType && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s">{ENTITY_TYPE_LABELS[value]}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RiskScoreChangeCell = ({ value }: { value: unknown }) => {
  if (typeof value !== 'number') return <>{'—'}</>;
  const delta = value;
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
};

const AlertCountCell = ({
  value,
  row,
  euiTheme,
  onAlertCountClick,
}: {
  value: unknown;
  row: Record<string, unknown>;
  euiTheme: EuiThemeComputed;
  onAlertCountClick?: (row: Record<string, unknown>) => void;
}) => {
  if (typeof value !== 'number' || value === 0) return <>{'—'}</>;
  const alertCount = value;
  const severities = ALERT_SEVERITIES.map(({ key, label, field }) => ({
    key,
    label,
    count: getNumber(row, field) ?? 0,
    color: getSeverityColor(key, euiTheme),
  })).filter((s) => s.count > 0);
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem css={noPointerEventsCss}>
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
};

const GroupSizeCell = ({
  value,
  row,
  onGroupSizeClick,
}: {
  value: unknown;
  row: Record<string, unknown>;
  onGroupSizeClick?: (row: Record<string, unknown>) => void;
}) =>
  onGroupSizeClick ? (
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

const RelativeTimeCell = ({ value }: { value: unknown }) => {
  if (value == null) return <>{'—'}</>;
  const m = typeof value === 'string' || typeof value === 'number' ? moment(value) : null;
  return <>{m?.isValid() ? m.fromNow() : String(value)}</>;
};

const AnomalyCountCell = ({
  value,
  row,
  onAnomalyCountClick,
}: {
  value: unknown;
  row: Record<string, unknown>;
  onAnomalyCountClick?: (row: Record<string, unknown>) => void;
}) => {
  if (typeof value !== 'number' || value === 0) return <>{'—'}</>;
  const anomalyCount = value;
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
};

const WatchlistsCell = ({
  value,
  watchlistNames,
}: {
  value: unknown;
  watchlistNames: Map<string, string>;
}) => {
  const names = toEntitySourceArray(value).map((id) => watchlistNames.get(id) ?? id);
  return (
    <TruncatedBadgeList
      values={names}
      overflowTooltipTitle={WATCHLISTS_OVERFLOW_TOOLTIP_TITLE}
      textSize="s"
      data-test-subj="entityWatchlistsValue"
    />
  );
};

const renderKnownEntityCell = (
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
    case 'entity.name':
      return <EntityNameCell value={value} row={row} onEntityNameClick={onEntityNameClick} />;
    case 'group_size':
      return <GroupSizeCell value={value} row={row} onGroupSizeClick={onGroupSizeClick} />;
    case 'last_seen_alert':
    case '@timestamp':
    case 'entity.lifecycle.first_seen':
      return <RelativeTimeCell value={value} />;
    case 'entity.EngineMetadata.Type':
      return <EntityTypeCell value={value} />;
    case 'entity.risk.calculated_score_norm':
      return <RiskScoreCell riskScore={typeof value === 'number' ? value : undefined} />;
    case 'risk_score_change':
      return <RiskScoreChangeCell value={value} />;
    case 'alert_count':
      return (
        <AlertCountCell
          value={value}
          row={row}
          euiTheme={euiTheme}
          onAlertCountClick={onAlertCountClick}
        />
      );
    case 'anomaly_count':
      return <AnomalyCountCell value={value} row={row} onAnomalyCountClick={onAnomalyCountClick} />;
    case 'case_count':
      return value == null || value === 0 ? <>{'—'}</> : <>{String(value)}</>;
    case 'entity.attributes.watchlists':
      return <WatchlistsCell value={value} watchlistNames={watchlistNames} />;
    case 'asset.criticality':
      return (
        <AssetCriticalityBadge
          criticalityLevel={isCriticalityLevel(value) ? value : 'unassigned'}
        />
      );
    case 'entity.source':
      return <EntitySourceValue values={toEntitySourceArray(value)} textSize="s" />;
    case 'entity.relationships.resolution.resolved_to':
      return <DefaultCell value={value} />;
  }

  return assertNever(columnId);
};

export const renderEntityCell = (
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
  return renderKnownEntityCell(columnId, value, row, watchlistNames, euiTheme, handlers);
};
