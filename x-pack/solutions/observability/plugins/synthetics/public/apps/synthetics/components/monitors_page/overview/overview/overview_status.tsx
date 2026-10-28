/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiStat,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { EmbeddablePanelWrapper } from '../../../common/components/embeddable_panel_wrapper';
import { clearOverviewStatusErrorAction } from '../../../../state/overview_status';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams, useUrlParams } from '../../../../hooks/use_url_params';
import { useOverviewStatusState } from '../../hooks/use_overview_status';
import { OverviewStatusDonut } from './overview_status_donut';

function title(t?: number) {
  return t ?? '-';
}

const sliceColor = (
  numberColor: string,
  colors: { success: string; danger: string; warning: string; mediumShade: string }
) => {
  if (numberColor === 'success') return colors.success;
  if (numberColor === 'danger') return colors.danger;
  if (numberColor === 'warning') return colors.warning;
  return colors.mediumShade;
};

export interface MonitorStatProps {
  dataTestSubj: string;
  statName: string;
  statNo: number | '-';
  numberColor: string;
  isClickable: boolean;
  onClickStat: () => void;
  tooltipContent?: string;
  titleSize?: 's' | 'm';
}

export type OverviewStatusView = 'stats' | 'donut';

const STATUS_VIEW_STORAGE_KEY = 'synthetics.overview.statusView';

export const getStoredOverviewStatusView = (): OverviewStatusView => {
  try {
    return window.localStorage.getItem(STATUS_VIEW_STORAGE_KEY) === 'donut' ? 'donut' : 'stats';
  } catch {
    return 'stats';
  }
};

const STATS_PER_ROW = 3;
// Matches the "Pings over time" chart's height below, so the two panels read
// as an even pair instead of this one collapsing tightly around its content.
const STATS_AREA_HEIGHT = '180px';
export const STATS_PANEL_MIN_WIDTH = 300;
export const DONUT_PANEL_MIN_WIDTH = 400;

export const MonitorStat = ({
  dataTestSubj,
  statName,
  statNo,
  numberColor,
  isClickable,
  onClickStat,
  tooltipContent,
  titleSize = 'm',
}: MonitorStatProps) => {
  const statComponent = (
    <EuiStat
      css={{ textAlign: 'start' }}
      data-test-subj={dataTestSubj}
      description={statName}
      reverse
      title={statNo}
      titleColor={numberColor}
      titleSize={titleSize}
    />
  );
  const stat = isClickable ? (
    <EuiButtonEmpty
      color="text"
      data-test-subj={`${dataTestSubj}Btn`}
      onClick={onClickStat}
      // `contentProps` is `EuiButtonEmpty`'s own supported composition point
      // for styling its internal content wrapper — not its private
      // `.euiButtonEmpty__content` class name.
      contentProps={{ css: { height: 'auto' } }}
      css={{ height: 'auto', blockSize: 'auto' }}
    >
      {statComponent}
    </EuiButtonEmpty>
  ) : (
    statComponent
  );

  // The tooltip icon must stay outside the clickable button: nested inside
  // it, a click/tap on the icon both bubbles up to change the status filter
  // (often unmounting the tooltip mid-read) and is invalid nested-interactive
  // markup for keyboard/screen-reader use.
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{stat}</EuiFlexItem>
      {tooltipContent && (
        <EuiFlexItem grow={false}>
          <EuiIconTip type="question" content={tooltipContent} position="top" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export function OverviewStatus({
  titleAppend,
  hideTitle,
  areStatsClickable = false,
  extraStats = [],
  onStatusViewChange,
  onStatusFilterClick,
}: {
  titleAppend?: React.ReactNode;
  hideTitle?: boolean;
  areStatsClickable?: boolean;
  extraStats?: MonitorStatProps[];
  onStatusViewChange?: (view: OverviewStatusView) => void;
  // Dashboard embeddables host this on a private history — merge-style
  // `updateUrlParams` would only change the dashboard URL. Callers that are
  // not the Synthetics overview pass a handler that `navigateToApp`s instead.
  onStatusFilterClick?: (statusFilter: string) => void;
}) {
  const { statusFilter } = useGetUrlParams();
  const [, updateUrlParams] = useUrlParams();
  const { euiTheme } = useEuiTheme();
  const [statusView, setStatusView] = useState<OverviewStatusView>(getStoredOverviewStatusView);

  const { status, error: statusError, loading } = useOverviewStatusState();
  const dispatch = useDispatch();

  const onToggleStatusView = useCallback(() => {
    setStatusView((current) => {
      const next = current === 'donut' ? 'stats' : 'donut';
      try {
        window.localStorage.setItem(STATUS_VIEW_STORAGE_KEY, next);
      } catch {
        // Ignore quota / private-mode failures; the in-memory toggle still works.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    onStatusViewChange?.(statusView);
  }, [onStatusViewChange, statusView]);
  const [statusConfig, setStatusConfig] = useState({
    up: status?.up,
    down: status?.down,
    pending: status?.pending,
    stale: status?.stale,
    disabledCount: status?.disabledCount,
  });

  useEffect(() => {
    if (statusError) {
      dispatch(clearOverviewStatusErrorAction());
      kibanaService.toasts.addError(statusError.body as Error, {
        title: errorToastTitle,
        toastLifeTimeMs: 5000,
      });
    }
  }, [dispatch, statusError]);

  useEffect(() => {
    if (statusFilter) {
      switch (statusFilter) {
        case 'up':
          setStatusConfig({
            up: status?.up || 0,
            down: 0,
            disabledCount: 0,
            pending: 0,
            stale: 0,
          });
          break;
        case 'down':
          setStatusConfig({
            up: 0,
            down: status?.down || 0,
            disabledCount: 0,
            pending: 0,
            stale: 0,
          });
          break;
        case 'disabled':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: status?.disabledCount || 0,
            pending: 0,
            stale: 0,
          });
          break;
        case 'pending':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: 0,
            pending: status?.pending || 0,
            stale: 0,
          });
          break;
        case 'stale':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: 0,
            pending: 0,
            stale: status?.stale || 0,
          });
          break;
      }
    } else if (status) {
      setStatusConfig({
        up: status.up,
        down: status.down,
        disabledCount: status.disabledCount,
        pending: status?.pending,
        stale: status?.stale,
      });
    }
  }, [status, statusFilter]);

  // `updateUrlParams` merges into the existing URL params (like `QuickFilters`
  // already does), rather than replacing them — a `navigateToApp({ path })`
  // call here would otherwise discard every other active filter and the
  // brushed/date-picker range. Clicking the already-selected status clears it,
  // matching `QuickFilters`' toggle behavior.
  const getOnClickStat = useCallback(
    (statusFilterName: string) => {
      return () => {
        if (onStatusFilterClick) {
          onStatusFilterClick(statusFilterName);
          return;
        }
        updateUrlParams({
          statusFilter: statusFilter !== statusFilterName ? statusFilterName : undefined,
        });
      };
    },
    [statusFilter, updateUrlParams, onStatusFilterClick]
  );

  const monitorStatData = useMemo(() => {
    const stats: MonitorStatProps[] = [
      {
        dataTestSubj: 'syntheticsOverviewUp',
        statName: upDescription,
        statNo: title(statusConfig?.up),
        numberColor: 'success',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('up'),
      },
      {
        dataTestSubj: 'syntheticsOverviewDown',
        statName: downDescription,
        statNo: title(statusConfig?.down),
        numberColor: 'danger',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('down'),
      },
    ];

    if (statusConfig?.disabledCount) {
      stats.push({
        dataTestSubj: 'xpack.uptime.synthetics.overview.status.disabled',
        statName: disabledDescription,
        statNo: title(statusConfig.disabledCount),
        numberColor: 'subdued',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('disabled'),
      });
    }

    if (statusConfig?.pending) {
      stats.push({
        dataTestSubj: 'xpack.uptime.synthetics.overview.status.pending',
        statName: pendingDescription,
        statNo: title(statusConfig.pending),
        numberColor: 'subdued',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('pending'),
        tooltipContent: pendingTooltip,
      });
    }

    if (statusConfig?.stale) {
      stats.push({
        dataTestSubj: 'xpack.uptime.synthetics.overview.status.stale',
        statName: staleDescription,
        statNo: title(statusConfig.stale),
        numberColor: 'warning',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('stale'),
        tooltipContent: staleTooltip,
      });
    }
    return stats;
  }, [areStatsClickable, getOnClickStat, statusConfig]);

  const allStats = useMemo(
    () => [...monitorStatData, ...extraStats],
    [monitorStatData, extraStats]
  );
  // Balance columns (e.g. 4 stats -> 2x2, not a 3-column row with a sparse
  // remainder row) and lay them out on an actual CSS grid, so every stat
  // lands in a shared column position across rows — a flex row per row would
  // otherwise center each row's items independently, and same-column stats
  // (e.g. "Up" over "Pending") would drift out of alignment whenever a
  // neighboring column's content width differs row to row.
  const numRows = Math.max(1, Math.ceil(allStats.length / STATS_PER_ROW));
  const columns = Math.ceil(allStats.length / numRows);
  const isDonutView = statusView === 'donut';

  const viewToggleLabel = isDonutView ? showStatsLabel : showDonutLabel;
  const viewToggle = (
    <EuiToolTip content={viewToggleLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="visPie"
        color={isDonutView ? 'primary' : 'text'}
        display={isDonutView ? 'fill' : 'empty'}
        aria-pressed={isDonutView}
        aria-label={viewToggleLabel}
        data-test-subj="syntheticsOverviewStatusViewToggle"
        onClick={onToggleStatusView}
      />
    </EuiToolTip>
  );

  return (
    <EmbeddablePanelWrapper
      title={headingText}
      loading={loading}
      titleAppend={
        titleAppend ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{titleAppend}</EuiFlexItem>
            <EuiFlexItem grow={false}>{viewToggle}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          viewToggle
        )
      }
      hideTitle={hideTitle}
      panelCss={
        isDonutView
          ? {
              paddingBottom: euiTheme.size.xs,
            }
          : undefined
      }
    >
      {!isDonutView && <EuiSpacer size="m" />}
      {isDonutView ? (
        <div
          css={{
            width: '100%',
            height: STATS_AREA_HEIGHT,
            paddingInlineStart: euiTheme.size.s,
          }}
        >
          <OverviewStatusDonut
            slices={monitorStatData.map((stat) => ({
              value: typeof stat.statNo === 'number' ? stat.statNo : 0,
              label: stat.statName,
              color: sliceColor(stat.numberColor, euiTheme.colors),
              dataTestSubj: `${stat.dataTestSubj}Legend`,
              isClickable: stat.isClickable,
              onClick: stat.onClickStat,
              tooltipContent: stat.tooltipContent,
            }))}
            total={monitorStatData.reduce(
              (sum, stat) => sum + (typeof stat.statNo === 'number' ? stat.statNo : 0),
              0
            )}
          />
        </div>
      ) : (
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            justifyItems: 'start',
            alignContent: 'space-around',
            minHeight: STATS_AREA_HEIGHT,
            paddingInlineStart: euiTheme.size.base,
          }}
        >
          {allStats.map((props) => (
            <MonitorStat {...props} key={props.dataTestSubj} />
          ))}
        </div>
      )}
    </EmbeddablePanelWrapper>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.monitors.headingText', {
  defaultMessage: 'Monitors status',
});

const showDonutLabel = i18n.translate('xpack.synthetics.overview.status.view.donut', {
  defaultMessage: 'Show status as donut chart',
});

const showStatsLabel = i18n.translate('xpack.synthetics.overview.status.view.stats', {
  defaultMessage: 'Show status as stats',
});

const upDescription = i18n.translate('xpack.synthetics.overview.status.up.description', {
  defaultMessage: 'Up',
});

const downDescription = i18n.translate('xpack.synthetics.overview.status.down.description', {
  defaultMessage: 'Down',
});

const pendingDescription = i18n.translate('xpack.synthetics.overview.status.pending.description', {
  defaultMessage: 'Pending',
});

const staleDescription = i18n.translate('xpack.synthetics.overview.status.stale.description', {
  defaultMessage: 'Stale',
});

const pendingTooltip = i18n.translate('xpack.synthetics.overview.status.pending.tooltip', {
  defaultMessage:
    'No recent checks have run for this monitor, so there is no status to show yet — typically a newly created monitor awaiting its first run.',
});

const staleTooltip = i18n.translate('xpack.synthetics.overview.status.stale.tooltip', {
  defaultMessage:
    'This monitor ran earlier but has stopped reporting. Its last known status may be stale and is worth investigating.',
});

const disabledDescription = i18n.translate(
  'xpack.synthetics.overview.status.disabled.description',
  {
    defaultMessage: 'Disabled',
  }
);

const errorToastTitle = i18n.translate('xpack.synthetics.overview.status.error.title', {
  defaultMessage: 'Unable to get monitor status metrics',
});
