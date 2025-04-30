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
import { useDispatch } from 'react-redux';
import { MonitorBarSeries } from '../components/monitor_bar_series';
import { useMonitorHistogram } from '../../../../hooks/use_monitor_histogram';
import {
  MonitorTypeEnum,
  OverviewStatusMetaData,
} from '../../../../../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../../../../../common/components/monitor_type_badge';
import { getFilterForTypeMessage } from '../../../../management/monitor_list_table/labels';
import { BadgeStatus } from '../../../../../common/components/monitor_status';
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

export const useMonitorsTableColumns = ({
  setFlyoutConfigCallback,
  items,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const history = useHistory();
  const { histogramsById, minInterval } = useMonitorHistogram({ items });

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
      const { configId, locationLabel, locationId, spaceId } = monitor;
      dispatch(
        setFlyoutConfigCallback({
          configId,
          id: configId,
          location: locationLabel,
          locationId,
          spaceId,
        })
      );
    },
    [dispatch, setFlyoutConfigCallback]
  );

  const columns: Array<EuiBasicTableColumn<OverviewStatusMetaData>> = useMemo(
    () => [
      {
        field: 'status',
        name: STATUS,
        render: (status: OverviewStatusMetaData['status'], monitor) => (
          <BadgeStatus
            status={status}
            isBrowserType={monitor.type === MonitorTypeEnum.BROWSER}
            onClickBadge={() => openFlyout(monitor)}
          />
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
      {
        name: ACTIONS,
        render: (monitor: OverviewStatusMetaData) => <MonitorsActions monitor={monitor} />,
        align: 'right',
        width: '40px',
      },
    ],
    [histogramsById, minInterval, onClickMonitorFilter, openFlyout]
  );

  return {
    columns,
  };
};
