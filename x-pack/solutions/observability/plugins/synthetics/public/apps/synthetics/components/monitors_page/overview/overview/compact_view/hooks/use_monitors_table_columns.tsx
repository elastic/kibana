/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBasicTableColumn, EuiLink, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MonitorStatusCol } from '../components/monitor_status_col';
import { selectOverviewState } from '../../../../../../state';
import { MonitorBarSeries } from '../components/monitor_bar_series';
import { useMonitorHistogram } from '../../../../hooks/use_monitor_histogram';
import { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../../../../../common/components/monitor_type_badge';
import { getFilterForTypeMessage } from '../../../../management/monitor_list_table/labels';
import { FlyoutParamProps } from '../../types';
import { MonitorsActions } from '../components/monitors_actions';
import {
  STATUS,
  ACTIONS,
  LOCATIONS,
  NAME,
  TAGS,
  DURATION,
  URL,
  NO_URL,
  MONITOR_HISTORY,
} from '../labels';
import { MonitorsDuration } from '../components/monitors_duration';
import { useKibanaSpace } from '../../../../../../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../../../../../../plugin';

export const useMonitorsTableColumns = ({
  setFlyoutConfigCallback,
  items,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const history = useHistory();
  const { histogramsById, minInterval } = useMonitorHistogram({ items });
  const { space } = useKibanaSpace();
  const { spaces } = useKibana<ClientPluginsStart>().services;

  const {
    pageState: { showFromAllSpaces },
  } = useSelector(selectOverviewState);

  const onClickMonitorFilter = useCallback(
    (filterName: string, filterValue: string) => {
      const searchParams = new URLSearchParams(history.location.search); // Get existing query params
      searchParams.set(filterName, JSON.stringify([filterValue])); // Add or update the query param

      history.push({
        search: searchParams.toString(), // Convert back to a query string
      });
    },
    [history]
  );

  const dispatch = useDispatch();

  const openFlyout = useCallback(
    (monitor: OverviewStatusMetaData) => {
      const { configId, locationLabel, locationId } = monitor;
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
        name: STATUS,
        render: (monitor: OverviewStatusMetaData) => (
          <MonitorStatusCol monitor={monitor} openFlyout={openFlyout} />
        ),
      },
      {
        field: 'name',
        name: NAME,
        render: (name: OverviewStatusMetaData['name'], monitor) => (
          <EuiFlexGroup
            direction="column"
            alignItems="flexStart"
            gutterSize="s"
            className="clickCellContent"
          >
            <EuiFlexItem>
              <EuiText size="s" onClick={() => openFlyout(monitor)}>
                {name}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MonitorTypeBadge
                monitorType={monitor.type}
                ariaLabel={getFilterForTypeMessage(monitor.type)}
                onClick={() => onClickMonitorFilter('monitorTypes', monitor.type)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'urls',
        name: URL,
        render: (url: OverviewStatusMetaData['urls']) =>
          url ? (
            <EuiLink
              data-test-subj="syntheticsCompactViewUrl"
              href={url}
              target="_blank"
              color="text"
              external
            >
              {url}
            </EuiLink>
          ) : (
            <EuiText>{NO_URL}</EuiText>
          ),
      },
      {
        field: 'locationLabel',
        name: LOCATIONS,
        render: (locationLabel: OverviewStatusMetaData['locationLabel']) => (
          <EuiLink
            data-test-subj="syntheticsCompactViewLocation"
            onClick={() => onClickMonitorFilter('locations', locationLabel)}
          >
            {locationLabel}
          </EuiLink>
        ),
      },
      {
        field: 'tags',
        name: TAGS,
        render: (tags: OverviewStatusMetaData['tags']) => (
          <TagsList tags={tags} onClick={(tag) => onClickMonitorFilter('tags', tag)} />
        ),
      },
      {
        name: DURATION,
        render: (monitor: OverviewStatusMetaData) => (
          <MonitorsDuration monitor={monitor} onClickDuration={() => openFlyout(monitor)} />
        ),
        width: '100px',
      },
      {
        align: 'left' as const,
        field: 'configId',
        name: MONITOR_HISTORY,
        mobileOptions: {
          show: false,
        },
        width: '220px',
        render: (configId: string, monitor: OverviewStatusMetaData) => {
          const uniqId = `${configId}-${monitor.locationId}`;
          return (
            <MonitorBarSeries
              histogramSeries={histogramsById?.[uniqId]?.points}
              minInterval={minInterval!}
            />
          );
        },
      },
      ...(showFromAllSpaces
        ? [
            {
              name: i18n.translate('xpack.synthetics.management.monitorList.spacesColumnTitle', {
                defaultMessage: 'Spaces',
              }),
              field: 'spaces',
              sortable: true,
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
    histogramsById,
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
