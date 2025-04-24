/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useDispatch } from 'react-redux';
import {
  MonitorTypeEnum,
  OverviewStatusMetaData,
} from '../../../../../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../../../../../common/components/monitor_type_badge';
import { getFilterForTypeMessage } from '../../../../management/monitor_list_table/labels';
import { BadgeStatus } from '../../../../../common/components/monitor_status';
import { FlyoutParamProps } from '../../types';
import { MonitorsActions } from '../components/monitors_actions';
import { STATUS, ACTIONS, LOCATIONS, NAME, TAGS, TYPE } from '../labels';

export const useMonitorsTableColumns = ({
  setFlyoutConfigCallback,
}: {
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const history = useHistory();

  const onClickMonitorType = useCallback(
    (type: MonitorTypeEnum) => {
      history.push({
        search: `monitorTypes=${encodeURIComponent(JSON.stringify([type]))}`,
      });
    },
    [history]
  );

  const onClickMonitorTag = useCallback(
    (tag: string) => {
      history.push({ search: `tags=${encodeURIComponent(JSON.stringify([tag]))}` });
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
          <EuiLink data-test-subj="syntheticsColumnsLink" onClick={() => openFlyout(monitor)}>
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'locationLabel',
        name: LOCATIONS,
        render: (locationLabel: OverviewStatusMetaData['locationLabel'], monitor) => (
          <EuiLink data-test-subj="syntheticsColumnsLink" onClick={() => openFlyout(monitor)}>
            {locationLabel}
          </EuiLink>
        ),
      },
      {
        field: 'type',
        name: TYPE,
        render: (type: OverviewStatusMetaData['type']) => (
          <MonitorTypeBadge
            monitorType={type}
            ariaLabel={getFilterForTypeMessage(type)}
            onClick={() => onClickMonitorType(type as MonitorTypeEnum)}
          />
        ),
      },
      {
        field: 'tags',
        name: TAGS,
        render: (tags: OverviewStatusMetaData['tags']) => (
          <TagsList tags={tags} onClick={onClickMonitorTag} />
        ),
      },
      {
        name: ACTIONS,
        render: (monitor: OverviewStatusMetaData) => <MonitorsActions monitor={monitor} />,
        align: 'right',
      },
    ],
    [onClickMonitorTag, onClickMonitorType, openFlyout]
  );

  return {
    columns,
  };
};
