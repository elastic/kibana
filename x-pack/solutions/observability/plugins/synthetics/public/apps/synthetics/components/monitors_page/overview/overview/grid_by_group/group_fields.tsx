/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../../hooks';
import { GroupMenu } from './group_menu';
import { GroupByTour } from './group_by_tour';
import { ConfigKey } from '../../../../../../../../common/runtime_types';

import type { GroupByState } from '../../../../../state/overview';
import { selectOverviewGroupBy, setOverviewGroupByAction } from '../../../../../state/overview';
import { selectOverviewStatus } from '../../../../../state/overview_status';

const DEFAULT_GROUP_BY: GroupByState = { field: 'none', order: 'asc' };
const LOCAL_STORAGE_KEY = 'synthetics.overviewGroupBy';

export const GroupFields = () => {
  const { field: groupField, order: groupOrder } = useSelector(selectOverviewGroupBy);
  const { allConfigs } = useSelector(selectOverviewStatus);
  const hasRemoteMonitors = allConfigs?.some((config) => Boolean(config.remote)) ?? false;
  const dispatch = useDispatch();
  const [urlParams, updateUrlParams] = useUrlParams();
  const [localStorageGroupBy, setLocalStorageGroupBy] =
    useLocalStorage<GroupByState>(LOCAL_STORAGE_KEY);

  const { groupBy: urlGroupField, groupOrderBy: urlGroupOrderBy } = urlParams();

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    if (urlGroupField) {
      const state: GroupByState = {
        field: urlGroupField,
        order: urlGroupOrderBy ?? 'asc',
      };
      dispatch(setOverviewGroupByAction(state));
      setLocalStorageGroupBy(state);
    } else if (localStorageGroupBy) {
      dispatch(setOverviewGroupByAction(localStorageGroupBy));
      if (localStorageGroupBy.field !== DEFAULT_GROUP_BY.field) {
        updateUrlParams({
          groupBy: localStorageGroupBy.field,
          groupOrderBy: localStorageGroupBy.order,
        });
      }
    }
  }, [
    dispatch,
    localStorageGroupBy,
    setLocalStorageGroupBy,
    updateUrlParams,
    urlGroupField,
    urlGroupOrderBy,
  ]);

  const handleChange = (groupByState: GroupByState) => {
    dispatch(setOverviewGroupByAction(groupByState));
    updateUrlParams({ groupBy: groupByState.field, groupOrderBy: groupByState.order });
    setLocalStorageGroupBy(groupByState);
  };

  const groupByOptions = [
    {
      label: NONE_LABEL,
      value: 'none',
      checked: groupField === 'none',
      defaultSortOrder: 'asc',
      onClick: () => {
        handleChange({
          field: 'none',
          order: groupOrder,
        });
      },
    },
    {
      label: MONITOR_LABEL,
      value: 'monitor',
      checked: groupField === 'monitor',
      defaultSortOrder: 'asc',
      onClick: () => {
        handleChange({
          field: 'monitor',
          order: groupOrder,
        });
      },
    },
    {
      label: LOCATION_LABEL,
      value: 'locationId',
      checked: groupField === 'locationId',
      defaultSortOrder: 'asc',
      onClick: () => {
        handleChange({
          field: 'locationId',
          order: groupOrder,
        });
      },
    },
    {
      label: MONITOR_TYPE_LABEL,
      value: ConfigKey.MONITOR_TYPE,
      checked: groupField === ConfigKey.MONITOR_TYPE,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleChange({
          field: ConfigKey.MONITOR_TYPE,
          order: groupOrder,
        });
      },
    },
    {
      label: TAG_LABEL,
      value: ConfigKey.TAGS,
      checked: groupField === ConfigKey.TAGS,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleChange({
          field: ConfigKey.TAGS,
          order: groupOrder,
        });
      },
    },
    {
      label: PROJECT_LABEL,
      value: ConfigKey.PROJECT_ID,
      checked: groupField === ConfigKey.PROJECT_ID,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleChange({
          field: ConfigKey.PROJECT_ID,
          order: groupOrder,
        });
      },
    },
    ...(hasRemoteMonitors
      ? [
          {
            label: REMOTE_CLUSTER_LABEL,
            value: 'remoteName',
            checked: groupField === 'remoteName',
            defaultSortOrder: 'asc',
            onClick: () => {
              handleChange({
                field: 'remoteName' as const,
                order: groupOrder,
              });
            },
          },
        ]
      : []),
  ];

  const { asc, desc, label } = getOrderContent(groupField);

  const orderByOptions = [
    {
      label: asc,
      value: 'asc',
      checked: groupOrder === 'asc',
      onClick: () => {
        handleChange({
          field: groupField,
          order: 'asc',
        });
      },
    },
    {
      label: desc,
      value: 'desc',
      checked: groupOrder === 'desc',
      onClick: () => {
        handleChange({
          field: groupField,
          order: 'desc',
        });
      },
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <GroupByTour>
          <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxxs">
                <span>{GROUP_TITLE}</span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="syntheticsOverviewGroupButton">
              <GroupMenu
                groupOptions={groupByOptions}
                orderByOptions={orderByOptions}
                groupField={label}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </GroupByTour>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getOrderContent = (groupField: string) => {
  switch (groupField) {
    case 'locationId':
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: LOCATION_LABEL,
      };
    case ConfigKey.MONITOR_TYPE:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: MONITOR_TYPE_LABEL,
      };
    case ConfigKey.TAGS:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: TAG_LABEL,
      };
    case ConfigKey.PROJECT_ID:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: PROJECT_LABEL,
      };
    case 'monitor':
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: MONITOR_LABEL,
      };
    case 'remoteName':
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: REMOTE_CLUSTER_LABEL,
      };

    default:
      return {
        asc: ASCENDING_LABEL,
        desc: DESCENDING_LABEL,
        label: NONE_LABEL,
      };
  }
};

export const GROUP_TITLE = i18n.translate('xpack.synthetics.overview.groupPopover.group.title', {
  defaultMessage: 'Group by',
});

const SORT_ALPHABETICAL_ASC = i18n.translate(
  'xpack.synthetics.overview.groupPopover.alphabetical.asc',
  {
    defaultMessage: 'A -> Z',
    description: 'Describes ascending alphabetical sort order',
  }
);

const SORT_ALPHABETICAL_DESC = i18n.translate(
  'xpack.synthetics.overview.groupPopover.alphabetical.desc',
  {
    defaultMessage: 'Z -> A',
    description: 'Describes descending alphabetical sort order',
  }
);

const ASCENDING_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.ascending.label', {
  defaultMessage: 'Ascending',
});

const DESCENDING_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.descending.label', {
  defaultMessage: 'Descending',
});

const NONE_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.none.label', {
  defaultMessage: 'None',
});
const MONITOR_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.monitor.label', {
  defaultMessage: 'Monitor',
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.location.label', {
  defaultMessage: 'Location',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.overview.groupPopover.monitorType.label',
  {
    defaultMessage: 'Monitor type',
  }
);

const TAG_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.tag.label', {
  defaultMessage: 'Tag',
});

const PROJECT_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.project.label', {
  defaultMessage: 'Project',
});

const REMOTE_CLUSTER_LABEL = i18n.translate(
  'xpack.synthetics.overview.groupPopover.remoteCluster.label',
  {
    defaultMessage: 'Remote cluster',
  }
);
