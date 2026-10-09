/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiOverlayMask, EuiPanel, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { get, invert, orderBy } from 'lodash';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { OverviewLoader } from '../overview_loader';
import {
  getSyntheticsFilterDisplayValues,
  monitorTypeKeyLabelMap,
} from '../../../../../utils/filters/filter_fields';
import { useFilters } from '../../../common/monitor_filters/use_filters';
import { GroupGridItem } from './grid_group_item';
import { ConfigKey } from '../../../../../../../../common/runtime_types';
import type { OverviewView } from '../../../../../state';
import { selectOverviewGroupBy, selectServiceLocationsState } from '../../../../../state';
import type { FlyoutParamProps } from '../types';
import { selectOverviewStatus } from '../../../../../state/overview_status';

export const HEARTBEAT_GROUP_ID = '__heartbeat__' as const;
export const REMOTE_GROUP_ID = '__remote__' as const;
export const LOCAL_GROUP_ID = '__local__' as const;

const HEARTBEAT_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.monitorsPage.overview.gridItemsByGroup.heartbeatMonitors',
  { defaultMessage: 'Heartbeat monitors' }
);
const REMOTE_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.monitorsPage.overview.gridItemsByGroup.remoteMonitors',
  { defaultMessage: 'Remote monitors' }
);
const LOCAL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.monitorsPage.overview.gridItemsByGroup.localMonitors',
  { defaultMessage: 'Local monitors' }
);

interface OverviewGroupValue {
  label: string;
  count: number;
  id?: typeof HEARTBEAT_GROUP_ID | typeof REMOTE_GROUP_ID;
}

const groupKey = (groupItem: OverviewGroupValue): string => groupItem.id ?? groupItem.label;

export const GridItemsByGroup = ({
  setFlyoutConfigCallback,
  view,
}: {
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
  view: OverviewView;
}) => {
  const [fullScreenGroup, setFullScreenGroup] = useState('');
  const { field: groupField, order: groupOrder } = useSelector(selectOverviewGroupBy);

  const { allConfigs, loaded } = useSelector(selectOverviewStatus);

  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const data = useFilters();

  if (!data) {
    return <EuiLoadingSpinner />;
  }

  const { monitorTypes, locations, projects, tags } = data;
  let selectedGroup: {
    key: string;
    items: OverviewGroupValue[];
    values: OverviewGroupValue[];
    otherValues: {
      id?: typeof LOCAL_GROUP_ID;
      label: string;
      items: typeof allConfigs;
    };
  } = {
    key: 'locationLabel',
    items: locations,
    values: getSyntheticsFilterDisplayValues(locations, 'locations', allLocations),
    otherValues: {
      label: 'Without any location',
      items: allConfigs?.filter((monitor) => !monitor.locations || monitor.locations.length === 0),
    },
  };

  switch (groupField) {
    case ConfigKey.MONITOR_TYPE:
      selectedGroup = {
        key: ConfigKey.MONITOR_TYPE,
        items: monitorTypes,
        values: getSyntheticsFilterDisplayValues(monitorTypes, 'monitorTypes', allLocations),
        otherValues: {
          label: i18n.translate('xpack.synthetics.monitorsPage.overview.gridItemsByGroup.noType', {
            defaultMessage: 'Invalid monitor type',
          }),
          items: allConfigs?.filter((monitor) => !get(monitor, ConfigKey.MONITOR_TYPE)),
        },
      };
      break;
    case 'locationId':
      selectedGroup = {
        key: 'locationLabel',
        items: locations,
        values: getSyntheticsFilterDisplayValues(locations, 'locations', allLocations),
        otherValues: {
          label: i18n.translate(
            'xpack.synthetics.monitorsPage.overview.gridItemsByGroup.noLocations',
            {
              defaultMessage: 'Without any location',
            }
          ),
          items: allConfigs?.filter(
            (monitor) => !monitor.locations || monitor.locations.length === 0
          ),
        },
      };
      break;
    case ConfigKey.TAGS:
      selectedGroup = {
        key: ConfigKey.TAGS,
        items: tags,
        values: getSyntheticsFilterDisplayValues(tags, 'tags', allLocations),
        otherValues: {
          label: i18n.translate('xpack.synthetics.monitorsPage.overview.gridItemsByGroup.noTags', {
            defaultMessage: 'Without any tags',
          }),
          items: allConfigs?.filter((monitor) => get(monitor, 'tags', []).length === 0),
        },
      };
      break;
    case ConfigKey.PROJECT_ID:
      selectedGroup = {
        key: 'projectId',
        items: projects,
        values: getSyntheticsFilterDisplayValues(projects, 'projects', allLocations),
        otherValues: {
          label: i18n.translate(
            'xpack.synthetics.monitorsPage.overview.gridItemsByGroup.uiMonitors',
            {
              defaultMessage: 'UI Monitors',
            }
          ),
          items: allConfigs?.filter((monitor) => !Boolean(monitor.projectId)),
        },
      };
      break;
    case 'remoteName': {
      const remoteNames = [
        ...new Set(
          (allConfigs ?? [])
            .filter((monitor) => monitor.origin !== 'heartbeat')
            .map((monitor) => monitor.remote?.remoteName)
            .filter((name): name is string => Boolean(name))
        ),
      ];
      // Break heartbeat/autodiscovery monitors out into their own bucket instead
      // of hiding them inside "Local monitors" alongside UI/project monitors.
      const heartbeatItems = allConfigs?.filter((monitor) => monitor.origin === 'heartbeat') ?? [];
      const remoteValues: OverviewGroupValue[] = [
        ...remoteNames.map((name) => ({ label: name, count: 0 })),
        ...(heartbeatItems.length
          ? [
              {
                id: HEARTBEAT_GROUP_ID,
                label: HEARTBEAT_MONITORS_LABEL,
                count: heartbeatItems.length,
              },
            ]
          : []),
      ];
      selectedGroup = {
        key: 'remote.remoteName',
        items: remoteValues,
        values: remoteValues,
        otherValues: {
          id: LOCAL_GROUP_ID,
          label: LOCAL_MONITORS_LABEL,
          items: allConfigs?.filter((monitor) => !monitor.remote && monitor.origin !== 'heartbeat'),
        },
      };
      break;
    }
    case 'origin': {
      // Coarse monitor-source grouping (distinct from the per-cluster
      // "Remote cluster" grouping): break heartbeat/autodiscovery monitors out
      // of the "Local monitors" catch-all they'd otherwise hide in. Heartbeat
      // and remote are mutually exclusive; everything else is local (UI/project).
      const heartbeatItems = allConfigs?.filter((monitor) => monitor.origin === 'heartbeat') ?? [];
      const remoteItems =
        allConfigs?.filter(
          (monitor) => Boolean(monitor.remote) && monitor.origin !== 'heartbeat'
        ) ?? [];
      const originValues: OverviewGroupValue[] = [
        ...(heartbeatItems.length
          ? [
              {
                id: HEARTBEAT_GROUP_ID,
                label: HEARTBEAT_MONITORS_LABEL,
                count: heartbeatItems.length,
              },
            ]
          : []),
        ...(remoteItems.length
          ? [{ id: REMOTE_GROUP_ID, label: REMOTE_MONITORS_LABEL, count: remoteItems.length }]
          : []),
      ];
      selectedGroup = {
        key: 'origin',
        items: originValues,
        values: originValues,
        otherValues: {
          id: LOCAL_GROUP_ID,
          label: LOCAL_MONITORS_LABEL,
          items: allConfigs?.filter((monitor) => monitor.origin !== 'heartbeat' && !monitor.remote),
        },
      };
      break;
    }
    default:
  }

  const selectedValues = orderBy(selectedGroup.values, 'label', groupOrder ?? 'asc');
  const otherGroupKey = selectedGroup.otherValues.id ?? selectedGroup.otherValues.label;

  if (monitorTypes.length === 0) {
    return <OverviewLoader />;
  }

  return (
    <>
      {selectedValues.map((groupItem) => {
        const filteredMonitors =
          allConfigs?.filter((monitor) => {
            // Match synthetic buckets by id so a remote named "Heartbeat monitors"
            // is not treated as the Heartbeat group.
            if (groupItem.id === HEARTBEAT_GROUP_ID) {
              return monitor.origin === 'heartbeat';
            }
            if (groupItem.id === REMOTE_GROUP_ID) {
              return Boolean(monitor.remote) && monitor.origin !== 'heartbeat';
            }
            if (selectedGroup.key === 'origin') {
              return false;
            }
            if (selectedGroup.key === 'locationLabel') {
              return monitor.locations?.some((loc) => loc.label === groupItem.label);
            }
            const value = get(monitor, selectedGroup.key);
            if (Array.isArray(value)) {
              return value.includes(groupItem.label);
            }
            if (selectedGroup.key === ConfigKey.MONITOR_TYPE) {
              const typeKey = invert(monitorTypeKeyLabelMap)[groupItem.label];
              return get(monitor, selectedGroup.key) === typeKey;
            }
            if (selectedGroup.key === 'remote.remoteName') {
              return monitor.origin !== 'heartbeat' && value === groupItem.label;
            }
            return value === groupItem.label;
          }) ?? [];
        const key = groupKey(groupItem);
        return (
          <React.Fragment key={key}>
            <WrappedPanel isFullScreen={fullScreenGroup === key}>
              <GroupGridItem
                groupId={key}
                groupLabel={groupItem.label}
                groupMonitors={filteredMonitors}
                loaded={loaded}
                setFlyoutConfigCallback={setFlyoutConfigCallback}
                setFullScreenGroup={setFullScreenGroup}
                fullScreenGroup={fullScreenGroup}
                view={view}
              />
            </WrappedPanel>
            <EuiSpacer size="m" />
          </React.Fragment>
        );
      })}
      {(selectedGroup.otherValues.items ?? []).length > 0 && (
        <WrappedPanel isFullScreen={fullScreenGroup === otherGroupKey}>
          <GroupGridItem
            groupId={otherGroupKey}
            groupLabel={selectedGroup.otherValues.label}
            groupMonitors={selectedGroup.otherValues.items ?? []}
            loaded={loaded}
            setFlyoutConfigCallback={setFlyoutConfigCallback}
            setFullScreenGroup={setFullScreenGroup}
            fullScreenGroup={fullScreenGroup}
            view={view}
          />
        </WrappedPanel>
      )}
    </>
  );
};

const WrappedPanel: FC<PropsWithChildren<{ isFullScreen: boolean }>> = ({
  isFullScreen,
  children,
}) => {
  const ref = useRef(null);

  if (!isFullScreen) {
    return (
      <StyledPanel hasShadow={false} hasBorder>
        {children}
      </StyledPanel>
    );
  }
  return (
    <EuiOverlayMask>
      <EuiFocusTrap clickOutsideDisables={true}>
        <div ref={ref}>
          <FullScreenPanel hasShadow={false} hasBorder>
            {children}
          </FullScreenPanel>
        </div>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
};

const StyledPanel = styled(EuiPanel)`
  &&& {
    .fullScreenButton {
      visibility: hidden;
    }
    :hover {
      .fullScreenButton {
        visibility: visible;
      }
    }
  }
`;

const FullScreenPanel = styled(EuiPanel)`
  &&& {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
  }
`;
