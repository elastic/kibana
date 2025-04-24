/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { TagsList } from '@kbn/observability-shared-plugin/public';

import { useDispatch } from 'react-redux';
import { setFlyoutConfig } from '../../../../../../state';
import {
  MonitorTypeEnum,
  OverviewStatusMetaData,
} from '../../../../../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../../../../../common/components/monitor_type_badge';
import { getFilterForTypeMessage } from '../../../../management/monitor_list_table/labels';
import { useOverviewStatus } from '../../../../hooks/use_overview_status';
import { BadgeStatus } from '../../../../../common/components/monitor_status';
import { FlyoutParamProps } from '../../types';
import { ActionsPopover } from '../../actions_popover';

const STATUS = i18n.translate('xpack.synthetics.overview.compactView.monitorStatus', {
  defaultMessage: 'Status',
});

const NAME = i18n.translate('xpack.synthetics.overview.compactView.monitorName', {
  defaultMessage: 'Name',
});

const TYPE = i18n.translate('xpack.synthetics.overview.compactView.monitorType', {
  defaultMessage: 'Type',
});

const LOCATIONS = i18n.translate('xpack.synthetics.overview.compactView.monitorLocations', {
  defaultMessage: 'Locations',
});

const TAGS = i18n.translate('xpack.synthetics.overview.compactView.monitorTags', {
  defaultMessage: 'Tags',
});

const ACTIONS = i18n.translate('xpack.synthetics.overview.compactView.monitorActions', {
  defaultMessage: 'Actions',
});

const MonitorActions = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <ActionsPopover
      isPopoverOpen={isPopoverOpen}
      locationId={monitor.locationId}
      monitor={monitor}
      position="default"
      setIsPopoverOpen={setIsPopoverOpen}
    />
  );
};

export const useOverviewCompactView = () => {
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

  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => {
      dispatch(setFlyoutConfig(params));
    },
    [dispatch]
  );

  const openFlyout = useCallback(
    (monitor: OverviewStatusMetaData) => {
      const { configId, locationLabel, locationId, spaceId } = monitor;

      dispatch(
        setFlyoutConfig({ configId, id: configId, location: locationLabel, locationId, spaceId })
      );
    },
    [dispatch]
  );

  const { loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

  const columns: Array<EuiBasicTableColumn<OverviewStatusMetaData>> = useMemo(
    () => [
      {
        field: 'status',
        name: STATUS,
        render: (status: OverviewStatusMetaData['status'], { type }) => (
          <BadgeStatus status={status} isBrowserType={type === MonitorTypeEnum.BROWSER} />
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
        render: (monitor: OverviewStatusMetaData) => <MonitorActions monitor={monitor} />,
        align: 'right',
      },
    ],
    [onClickMonitorTag, onClickMonitorType, openFlyout]
  );

  return {
    columns,
    loading: !loaded,
    setFlyoutConfigCallback,
  };
};
