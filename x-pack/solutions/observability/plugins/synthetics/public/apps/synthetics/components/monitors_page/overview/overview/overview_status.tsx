/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EmbeddablePanelWrapper } from '../../../common/components/embeddable_panel_wrapper';
import { clearOverviewStatusErrorAction } from '../../../../state/overview_status';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams } from '../../../../hooks/use_url_params';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import { PLUGIN } from '../../../../../../../common/constants/plugin';

function title(t?: number) {
  return t ?? '-';
}

interface MonitorStatProps {
  dataTestSubj: string;
  statName: string;
  statNo: number | '-';
  numberColor: string;
  isClickable: boolean;
  onClickStat: () => void;
}

const MonitorStat = ({
  dataTestSubj,
  statName,
  statNo,
  numberColor,
  isClickable,
  onClickStat,
}: MonitorStatProps) => {
  const statComponent = (
    <EuiStat
      data-test-subj={dataTestSubj}
      description={statName}
      reverse
      title={statNo}
      titleColor={numberColor}
      titleSize="m"
    />
  );
  return isClickable ? (
    <EuiButtonEmpty data-test-subj={`${dataTestSubj}Btn`} onClick={onClickStat}>
      {statComponent}
    </EuiButtonEmpty>
  ) : (
    statComponent
  );
};

export function OverviewStatus({
  titleAppend,
  hideTitle,
  areStatsClickable = false,
}: {
  titleAppend?: React.ReactNode;
  hideTitle?: boolean;
  areStatsClickable?: boolean;
}) {
  const { statusFilter } = useGetUrlParams();
  const { application } = useKibana().services;

  const {
    status,
    error: statusError,
    loading,
  } = useOverviewStatus({ scopeStatusByLocation: true });
  const dispatch = useDispatch();
  const [statusConfig, setStatusConfig] = useState({
    up: status?.up,
    down: status?.down,
    pending: status?.pending,
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
          });
          break;
        case 'down':
          setStatusConfig({
            up: 0,
            down: status?.down || 0,
            disabledCount: 0,
            pending: 0,
          });
          break;
        case 'disabled':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: status?.disabledCount || 0,
            pending: 0,
          });
          break;
        case 'pending':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: 0,
            pending: status?.pending || 0,
          });
          break;
      }
    } else if (status) {
      setStatusConfig({
        up: status.up,
        down: status.down,
        disabledCount: status.disabledCount,
        pending: status?.pending,
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
      {
        dataTestSubj: 'xpack.uptime.synthetics.overview.status.disabled',
        statName: disabledDescription,
        statNo: title(statusConfig?.disabledCount),
        numberColor: 'subdued',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('disabled'),
      },
    ];

    if (statusConfig?.pending) {
      stats.push({
        dataTestSubj: 'xpack.uptime.synthetics.overview.status.pending',
        statName: pendingDescription,
        statNo: title(statusConfig.pending),
        numberColor: 'subdued',
        isClickable: areStatsClickable,
        onClickStat: getOnClickStat('pending'),
      });
    }
    return stats;
  }, [areStatsClickable, getOnClickStat, statusConfig]);

  return (
    <EmbeddablePanelWrapper
      title={headingText}
      loading={loading}
      titleAppend={titleAppend}
      hideTitle={hideTitle}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" justifyContent="spaceAround">
        {monitorStatData.map((props) => (
          <EuiFlexItem grow={false} key={props.dataTestSubj}>
            <MonitorStat {...props} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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

const disabledDescription = i18n.translate(
  'xpack.synthetics.overview.status.disabled.description',
  {
    defaultMessage: 'Disabled',
  }
);

const errorToastTitle = i18n.translate('xpack.synthetics.overview.status.error.title', {
  defaultMessage: 'Unable to get monitor status metrics',
});
