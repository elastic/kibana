/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiOverlayMask, EuiPanel, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import React, { useRef, useState, FC, PropsWithChildren } from 'react';
import { useSelector } from 'react-redux';
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
import { selectOverviewState, selectServiceLocationsState } from '../../../../../state';
import { FlyoutParamProps } from '../types';
import { selectOverviewStatus } from '../../../../../state/overview_status';

export const GridItemsByGroup = ({
  setFlyoutConfigCallback,
}: {
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const [fullScreenGroup, setFullScreenGroup] = useState('');
  const {
    groupBy: { field: groupField, order: groupOrder },
  } = useSelector(selectOverviewState);

  const { allConfigs, loaded } = useSelector(selectOverviewStatus);

  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const data = useFilters();

  if (!data) {
    return <EuiLoadingSpinner />;
  }

  const { monitorTypes, locations, projects, tags } = data;
  let selectedGroup = {
    key: 'location',
    items: locations,
    values: getSyntheticsFilterDisplayValues(locations, 'locations', allLocations),
    otherValues: {
      label: 'Without any location',
      items: allConfigs?.filter((monitor) => get(monitor, 'locations', []).length === 0),
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
          items: allConfigs?.filter((monitor) => !get(monitor, 'location')),
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
    default:
  }

  const selectedValues = orderBy(selectedGroup.values, 'label', groupOrder ?? 'asc');

  if (monitorTypes.length === 0) {
    return <OverviewLoader />;
  }

  return (
    <>
      {selectedValues.map((groupItem) => {
        const filteredMonitors =
          allConfigs?.filter((monitor) => {
            const value = get(monitor, selectedGroup.key);
            if (Array.isArray(value)) {
              return value.includes(groupItem.label);
            }
            if (selectedGroup.key === ConfigKey.MONITOR_TYPE) {
              const typeKey = invert(monitorTypeKeyLabelMap)[groupItem.label];
              return get(monitor, selectedGroup.key) === typeKey;
            }
            return get(monitor, selectedGroup.key) === groupItem.label;
          }) ?? [];
        return (
          <>
            <WrappedPanel isFullScreen={fullScreenGroup === groupItem.label}>
              <GroupGridItem
                groupLabel={groupItem.label}
                groupMonitors={filteredMonitors}
                loaded={loaded}
                setFlyoutConfigCallback={setFlyoutConfigCallback}
                setFullScreenGroup={setFullScreenGroup}
                fullScreenGroup={fullScreenGroup}
              />
            </WrappedPanel>
            <EuiSpacer size="m" />
          </>
        );
      })}
      {(selectedGroup.otherValues.items ?? []).length > 0 && (
        <WrappedPanel isFullScreen={fullScreenGroup === selectedGroup.otherValues.label}>
          <GroupGridItem
            groupLabel={selectedGroup.otherValues.label}
            groupMonitors={selectedGroup.otherValues.items ?? []}
            loaded={loaded}
            setFlyoutConfigCallback={setFlyoutConfigCallback}
            setFullScreenGroup={setFullScreenGroup}
            fullScreenGroup={fullScreenGroup}
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
