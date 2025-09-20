/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  EncryptedSyntheticsMonitor,
  OverviewStatusMetaData,
} from '../../../../../../../../common/runtime_types';
import { selectServiceLocationsState } from '../../../../../state';
import { MonitorStatus } from '../../../../common/components/monitor_status';
import { MonitorLocationSelect } from '../../../../common/components/monitor_location_select';
import { MonitorEnabled } from '../../../management/monitor_list_table/monitor_enabled';
import { useOverviewStatusByLocation } from './use_overview_status_by_location';

export function DetailedFlyoutHeader({
  overviewItem,
  currentLocationId,
  configId,
  setCurrentLocation,
  monitor,
  onEnabledChange,
}: {
  overviewItem: OverviewStatusMetaData;
  currentLocationId: string;
  configId: string;
  monitor?: EncryptedSyntheticsMonitor | null;
  onEnabledChange: () => void;
  setCurrentLocation: (location: string, locationId: string) => void;
}) {
  const { locationsStatuses } = useOverviewStatusByLocation({
    configId,
    monitorLocations: monitor?.locations,
  });

  const status = locationsStatuses.find((l) => l.id === currentLocationId)?.status;
  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const selectedLocation = allLocations.find((ll) => ll.id === currentLocationId);

  return (
    <EuiFlexGroup wrap={true} responsive={false}>
      <EuiFlexItem grow={false}>
        <MonitorStatus status={status} monitorType={overviewItem.type} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MonitorLocationSelect
          compressed
          monitorLocations={monitor?.locations}
          configId={configId}
          selectedLocation={selectedLocation}
          onChange={useCallback(
            (id: any, label: any) => {
              if (currentLocationId !== id) setCurrentLocation(label, id);
            },
            [currentLocationId, setCurrentLocation]
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList align="left" compressed>
          <EuiDescriptionListTitle>{ENABLED_ITEM_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {monitor && (
              <MonitorEnabled configId={configId} monitor={monitor} reloadPage={onEnabledChange} />
            )}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled (all locations)',
});
