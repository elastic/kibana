/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { selectOverviewPageState } from '../../../../../../state';
import { MonitorStatusCol } from '../components/monitor_status_col';
import { MonitorLocations } from '../../../../management/monitor_list_table/monitor_locations';
import { MonitorBarSeries } from '../components/monitor_bar_series';
import { useMonitorHistogram } from '../../../../hooks/use_monitor_histogram';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../../../../../common/components/monitor_type_badge';
import { getFilterForTypeMessage } from '../../../../management/monitor_list_table/labels';
import type { FlyoutParamProps } from '../../types';
import { MonitorsActions } from '../components/monitors_actions';
import {
  STATUS,
  ACTIONS,
  LOCATIONS,
  NAME,
  TAGS,
  URL,
  NO_URL,
  MONITOR_HISTORY,
} from '../labels';
import { useKibanaSpace } from '../../../../../../../../hooks/use_kibana_space';
import type { ClientPluginsStart } from '../../../../../../../../plugin';

export const useMonitorsTableColumns = ({
  setFlyoutConfigCallback,
  items,
  isFlyoutOpen,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
  isFlyoutOpen?: boolean;
}) => {
  const history = useHistory();
  const { histogramsById, minInterval } = useMonitorHistogram({ items });
  const { space } = useKibanaSpace();
  const { spaces } = useKibana<ClientPluginsStart>().services;

  const { showFromAllSpaces } = useSelector(selectOverviewPageState);

  // The Spaces column only adds value when monitors actually span more than
  // one space. When the visible page only contains a single unique space, the
  // 120px column degenerates into a wall of identical avatars — so hide it
  // and let the surrounding columns reclaim the room.
  const hasMultipleSpaces = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      for (const sp of item.spaces ?? []) {
        seen.add(sp);
        if (seen.size > 1) return true;
      }
    }
    return false;
  }, [items]);

  const onClickMonitorFilter = useCallback(
    (filterName: string, filterValue: string) => {
      const searchParams = new URLSearchParams(history.location.search);
      searchParams.set(filterName, JSON.stringify([filterValue]));

      history.push({
        search: searchParams.toString(),
      });
    },
    [history]
  );

  const dispatch = useDispatch();

  const openFlyout = useCallback(
    (monitor: OverviewStatusMetaData) => {
      const { configId } = monitor;

      const locationId = monitor.locations[0]?.id ?? '';
      const locationLabel = monitor.locations[0]?.label ?? '';
      dispatch(
        setFlyoutConfigCallback({
          configId,
          id: configId,
          location: locationLabel,
          locationId,
          spaces: monitor.spaces,
        })
      );
    },
    [dispatch, setFlyoutConfigCallback]
  );

  const columns: Array<EuiBasicTableColumn<OverviewStatusMetaData>> = useMemo(() => {
    const LazySpaceList = spaces?.ui.components.getSpaceList ?? (() => null);

    return [
      {
        field: 'overallStatus',
        name: STATUS,
        width: '120px',
        sortable: true,
        render: (_overallStatus: string, monitor: OverviewStatusMetaData) => (
          <MonitorStatusCol monitor={monitor} openFlyout={openFlyout} />
        ),
      },
      {
        field: 'name',
        name: NAME,
        width: '15%',
        sortable: true,
        render: (name: OverviewStatusMetaData['name'], monitor) => (
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <MonitorTypeBadge
                    monitorType={monitor.type}
                    ariaLabel={getFilterForTypeMessage(monitor.type)}
                    onClick={() => onClickMonitorFilter('monitorTypes', monitor.type)}
                    size="s"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.synthetics.overview.compactView.scheduleInline', {
                      defaultMessage: 'Every {schedule}m',
                      values: { schedule: monitor.schedule },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      ...(isFlyoutOpen
        ? []
        : [
            {
              field: 'urls' as const,
              name: URL,
              truncateText: true,
              sortable: true,
              width: '15%',
              render: (url: OverviewStatusMetaData['urls']) =>
                url ? (
                  <EuiLink
                    data-test-subj="syntheticsCompactViewUrl"
                    href={url}
                    target="_blank"
                    color="text"
                    external
                    css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {url}
                  </EuiLink>
                ) : (
                  <EuiText>{NO_URL}</EuiText>
                ),
            },
          ]),
      {
        name: LOCATIONS,
        width: '120px',
        render: (monitor: OverviewStatusMetaData) => {
          return (
            <MonitorLocations configId={monitor.configId} locationsWithStatus={monitor.locations} />
          );
        },
      },
      ...(isFlyoutOpen
        ? []
        : [
            {
              name: TAGS,
              width: '15%',
              render: (monitor: OverviewStatusMetaData) => (
                <TagsList
                  tags={monitor.tags}
                  onClick={(tag) => onClickMonitorFilter('tags', tag)}
                />
              ),
            },
          ]),
      ...(isFlyoutOpen
        ? []
        : [
            {
              align: 'left' as const,
              field: 'configId' as const,
              name: MONITOR_HISTORY,
              mobileOptions: {
                show: false,
              },
              width: '180px',
              render: (configId: string, monitor: OverviewStatusMetaData) => {
                const locationId = monitor.locations[0]?.id ?? '';
                const uniqId = `${configId}-${locationId}`;
                return (
                  <MonitorBarSeries
                    histogramSeries={
                      histogramsById?.[uniqId]?.points ?? histogramsById[configId]?.points
                    }
                    minInterval={minInterval!}
                  />
                );
              },
            },
          ]),
      ...(showFromAllSpaces && hasMultipleSpaces
        ? [
            {
              name: i18n.translate('xpack.synthetics.management.monitorList.spacesColumnTitle', {
                defaultMessage: 'Spaces',
              }),
              field: 'spaces',
              width: '120px',
              render: (monSpaces: string[]) => {
                return (
                  <LazySpaceList
                    namespaces={monSpaces ?? (space ? [space?.id] : [])}
                    behaviorContext="outside-space"
                  />
                );
              },
            },
          ]
        : []),
      {
        name: ACTIONS,
        render: (monitor: OverviewStatusMetaData) => <MonitorsActions monitor={monitor} />,
        align: 'right',
        width: '40px',
      },
    ];
  }, [
    hasMultipleSpaces,
    histogramsById,
    isFlyoutOpen,
    minInterval,
    onClickMonitorFilter,
    openFlyout,
    showFromAllSpaces,
    space,
    spaces?.ui.components.getSpaceList,
  ]);

  return {
    columns,
  };
};
