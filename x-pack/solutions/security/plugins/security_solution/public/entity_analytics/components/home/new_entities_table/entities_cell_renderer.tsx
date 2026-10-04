/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
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
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    key: 'high',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.high', {
      defaultMessage: 'High',
    }),
  },
  {
    key: 'medium',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    key: 'low',
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

const ellipsisCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const DefaultCell = memo(({ value }: { value: unknown }) => {
  const text = Array.isArray(value) ? value.map((v) => String(v)).join(', ') : String(value ?? '—');
  return <div css={ellipsisCss}>{text}</div>;
});
DefaultCell.displayName = 'DefaultCell';

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

const nameLinkCss = css`
  display: block;
  width: 100%;
  min-width: 0;
`;

/**
 * Truncates with CSS. EuiTextTruncate measures each cell after render, which costs a
 * commit per cell; CSS ellipsis also keeps the full name readable by screen readers.
 */
const EntityNameCell = memo(
  ({
    value,
    row,
    onEntityNameClick,
  }: {
    value: unknown;
    row: Record<string, unknown>;
    onEntityNameClick?: (row: Record<string, unknown>) => void;
  }) => {
    const name = String(value ?? '—');
    const text = (
      <span css={ellipsisCss} title={name}>
        {name}
      </span>
    );
    return (
      <div css={nameCellCss}>
        {onEntityNameClick ? (
          <EuiLink onClick={() => onEntityNameClick(row)} css={[nameLinkCss, ellipsisCss]}>
            {text}
          </EuiLink>
        ) : (
          <div css={ellipsisCss}>{text}</div>
        )}
      </div>
    );
  }
);
EntityNameCell.displayName = 'EntityNameCell';

// Cell leaves below are memoized on primitive props: EUI re-renders every cell when the
// page rows change (shell, then enrich), but most cell values stay the same.

const EntityTypeCell = memo(({ value }: { value: unknown }) => {
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
});
EntityTypeCell.displayName = 'EntityTypeCell';

const RiskScoreChangeCell = memo(({ value }: { value: unknown }) => {
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
});
RiskScoreChangeCell.displayName = 'RiskScoreChangeCell';

interface AlertSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** The distribution bar is the most expensive cell content, so it renders only on new counts. */
const AlertSeverityBar = memo(
  ({ euiTheme, ...counts }: AlertSeverityCounts & { euiTheme: EuiThemeComputed }) => {
    const severities = ALERT_SEVERITIES.map(({ key, label }) => ({
      key,
      label,
      count: counts[key],
      color: getSeverityColor(key, euiTheme),
    })).filter((s) => s.count > 0);
    return <DistributionBar stats={severities} hideLastTooltip />;
  }
);
AlertSeverityBar.displayName = 'AlertSeverityBar';

const AlertCountCell = memo(
  ({
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
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem css={noPointerEventsCss}>
          <AlertSeverityBar
            euiTheme={euiTheme}
            critical={getNumber(row, 'alert_critical') ?? 0}
            high={getNumber(row, 'alert_high') ?? 0}
            medium={getNumber(row, 'alert_medium') ?? 0}
            low={getNumber(row, 'alert_low') ?? 0}
          />
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
);
AlertCountCell.displayName = 'AlertCountCell';

const GroupSizeCell = memo(
  ({
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
    )
);
GroupSizeCell.displayName = 'GroupSizeCell';

const RelativeTimeCell = memo(({ value }: { value: unknown }) => {
  if (value == null) return <>{'—'}</>;
  const m = typeof value === 'string' || typeof value === 'number' ? moment(value) : null;
  return <>{m?.isValid() ? m.fromNow() : String(value)}</>;
});
RelativeTimeCell.displayName = 'RelativeTimeCell';

const AnomalyCountCell = memo(
  ({
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
  }
);
AnomalyCountCell.displayName = 'AnomalyCountCell';

const WatchlistsCell = memo(
  ({ value, watchlistNames }: { value: unknown; watchlistNames: Map<string, string> }) => {
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
);
WatchlistsCell.displayName = 'WatchlistsCell';

const RiskScoreValueCell = memo(({ value }: { value: unknown }) => (
  <RiskScoreCell riskScore={typeof value === 'number' ? value : undefined} />
));
RiskScoreValueCell.displayName = 'RiskScoreValueCell';

const CriticalityCell = memo(({ value }: { value: unknown }) => (
  <AssetCriticalityBadge criticalityLevel={isCriticalityLevel(value) ? value : 'unassigned'} />
));
CriticalityCell.displayName = 'CriticalityCell';

const SourceCell = memo(({ value }: { value: unknown }) => (
  <EntitySourceValue values={toEntitySourceArray(value)} textSize="s" />
));
SourceCell.displayName = 'SourceCell';

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
      return <RiskScoreValueCell value={value} />;
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
      return <CriticalityCell value={value} />;
    case 'entity.source':
      return <SourceCell value={value} />;
    case 'entity.relationships.resolution.resolved_to':
      return <DefaultCell value={value} />;
  }

  return assertNever(columnId);
};

/** Columns that page enrichers fill after the sort query; the sort column has its value. */
const ENRICHED_COLUMN_IDS: ReadonlySet<string> = new Set<GridColumnId>([
  'alert_count',
  'last_seen_alert',
  'anomaly_count',
  'case_count',
  'risk_score_change',
  'group_size',
]);

export const renderEntityCell = (
  columnId: string,
  value: unknown,
  row: Record<string, unknown>,
  watchlistNames: Map<string, string>,
  euiTheme: EuiThemeComputed,
  handlers?: CellHandlers,
  isEnriching = false
): JSX.Element => {
  // Enrichers set every field they own (null or 0 when empty), so `undefined` here
  // means "not loaded yet", not "no value". Show nothing rather than "—".
  if (isEnriching && value === undefined && ENRICHED_COLUMN_IDS.has(columnId)) {
    return <></>;
  }
  if (!isGridColumnId(columnId)) {
    return <DefaultCell value={value} />;
  }
  return renderKnownEntityCell(columnId, value, row, watchlistNames, euiTheme, handlers);
};
