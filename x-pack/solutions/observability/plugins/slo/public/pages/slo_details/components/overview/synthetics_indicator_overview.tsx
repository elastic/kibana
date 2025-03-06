/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { syntheticsAvailabilityIndicatorSchema, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import {
  syntheticsMonitorDetailLocatorID,
  syntheticsMonitorLocationQueryLocatorID,
} from '@kbn/observability-plugin/common';
import { useKibana } from '../../../../hooks/use_kibana';
import { OverviewItem } from './overview_item';

interface Props {
  slo: SLOWithSummaryResponse;
}

export function SyntheticsIndicatorOverview({ slo }: Props) {
  const {
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const monitorLocator = locators.get(syntheticsMonitorDetailLocatorID);
  const regionLocator = locators.get(syntheticsMonitorLocationQueryLocatorID);

  const { 'monitor.name': name, 'observer.geo.name': location } = slo.groupings;

  const { locationId, monitorId } = slo.meta?.synthetics || {};

  const indicator = slo.indicator;
  if (!syntheticsAvailabilityIndicatorSchema.is(indicator)) {
    return null;
  }

  const onMonitorClick = () => monitorLocator?.navigate({ configId: monitorId, locationId });
  const onLocationClick = () => regionLocator?.navigate({ locationId: location });
  const showOverviewItem = name || location;

  if (!showOverviewItem) {
    return null;
  }

  return (
    <OverviewItem
      title={MONITOR_LABEL}
      subtitle={
        <EuiFlexGroup direction="row" alignItems="flexStart" gutterSize="s" responsive={false} wrap>
          {name && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                onClick={onMonitorClick}
                iconOnClick={onMonitorClick}
                onClickAriaLabel={MONITOR_ARIA_LABEL}
                iconOnClickAriaLabel={MONITOR_ARIA_LABEL}
              >
                {i18n.translate('xpack.slo.sloDetails.overview.syntheticsMonitor.name', {
                  defaultMessage: 'Name: {value}',
                  values: { value: name },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {location && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                onClick={onLocationClick}
                iconOnClick={onLocationClick}
                onClickAriaLabel={LOCATION_ARIA_LABEL}
                iconOnClickAriaLabel={LOCATION_ARIA_LABEL}
              >
                {i18n.translate('xpack.slo.sloDetails.overview.syntheticsMonitor.locationName', {
                  defaultMessage: 'Location: {value}',
                  values: { value: location },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
}

const MONITOR_LABEL = i18n.translate('xpack.slo.sloDetails.overview.syntheticsMonitor', {
  defaultMessage: 'Synthetics monitor',
});

const MONITOR_ARIA_LABEL = i18n.translate(
  'xpack.slo.sloDetails.overview.syntheticsMonitorDetails',
  {
    defaultMessage: 'Synthetics monitor details',
  }
);

const LOCATION_ARIA_LABEL = i18n.translate(
  'xpack.slo.sloDetails.overview.syntheticsLocationGroup',
  {
    defaultMessage: 'View all monitors in this location',
  }
);
