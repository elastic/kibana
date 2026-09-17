/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EmbeddablePanelWrapper } from '../../../common/components/embeddable_panel_wrapper';
import { clearOverviewStatusErrorAction } from '../../../../state/overview_status';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams } from '../../../../hooks/use_url_params';
import { useOverviewStatusState } from '../../hooks/use_overview_status';
import { PLUGIN } from '../../../../../../../common/constants/plugin';

function title(t?: number) {
  return t ?? '-';
}

export interface MonitorStatProps {
  dataTestSubj: string;
  statName: string;
  statNo: number | '-';
  numberColor: string;
  isClickable: boolean;
  onClickStat: () => void;
  tooltipContent?: string;
}

const STATS_PER_ROW = 3;
// Matches the "Pings over time" chart's height below, so the two panels read
// as an even pair instead of this one collapsing tightly around its content.
const STATS_AREA_HEIGHT = '180px';

export const MonitorStat = ({
  dataTestSubj,
  statName,
  statNo,
  numberColor,
  isClickable,
  onClickStat,
  tooltipContent,
}: MonitorStatProps) => {
  // Always the same flex structure (icon slot present but empty when there's
  // no tooltip), so every stat's label sits at the same height/baseline —
  // conditionally swapping between plain text and a flex-wrapped row shifted
  // "Pending"/"Stale" (which have a tooltip) out of line with the rest.
  const description = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{statName}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        {tooltipContent && <EuiIconTip type="question" content={tooltipContent} position="top" />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const statComponent = (
    <EuiStat
      data-test-subj={dataTestSubj}
      description={description}
      reverse
      title={statNo}
      titleColor={numberColor}
      titleSize="m"
    />
  );
  const stat = isClickable ? (
    <EuiButtonEmpty
      color="text"
      data-test-subj={`${dataTestSubj}Btn`}
      onClick={onClickStat}
      css={{ height: 'auto', blockSize: 'auto', '.euiButtonEmpty__content': { height: 'auto' } }}
    >
      {statComponent}
    </EuiButtonEmpty>
  ) : (
    statComponent
  );

  return stat;
};

export function OverviewStatus({
  titleAppend,
  hideTitle,
  areStatsClickable = false,
  extraStats = [],
}: {
  titleAppend?: React.ReactNode;
  hideTitle?: boolean;
  areStatsClickable?: boolean;
  extraStats?: MonitorStatProps[];
}) {
  const { statusFilter } = useGetUrlParams();
  const { application } = useKibana().services;

  const { status, error: statusError, loading } = useOverviewStatusState();
  const dispatch = useDispatch();
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

  const getOnClickStat = useCallback(
    (statusFilterName: string) => {
      return () => {
        application?.navigateToApp(PLUGIN.SYNTHETICS_PLUGIN_ID, {
          path: `?statusFilter=${statusFilterName}`,
        });
      };
    },
    [application]
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

  return (
    <EmbeddablePanelWrapper
      title={headingText}
      loading={loading}
      titleAppend={titleAppend}
      hideTitle={hideTitle}
    >
      <EuiSpacer size="m" />
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          justifyItems: 'center',
          alignContent: 'space-around',
          minHeight: STATS_AREA_HEIGHT,
        }}
      >
        {allStats.map((props) => (
          <MonitorStat {...props} key={props.dataTestSubj} />
        ))}
      </div>
    </EmbeddablePanelWrapper>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.monitors.headingText', {
  defaultMessage: 'Monitors status',
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
