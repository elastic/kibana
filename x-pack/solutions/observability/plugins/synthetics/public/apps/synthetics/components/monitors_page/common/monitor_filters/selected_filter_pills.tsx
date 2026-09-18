/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux-v7';
import { isLogicalAndField } from '../../../../../../../common/constants';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';
import { selectServiceLocationsState } from '../../../../state';
import { hasActiveMonitorFilters } from '../../../../utils/filters/clear_monitor_filter_params';
import type {
  SyntheticsMonitorFilterChangeHandler,
  SyntheticsMonitorFilterField,
} from '../../../../utils/filters/filter_fields';
import {
  getSyntheticsFilterDisplayValues,
  valueToLabelWithEmptyCount,
} from '../../../../utils/filters/filter_fields';
import { getRemoteOriginFieldLabel } from '../../../../utils/remote/remote_origin_copy';
import { ClearAllFilters } from './clear_all_filters';
import {
  LOCATION_LABEL,
  PROJECT_LABEL,
  SCHEDULE_LABEL,
  STATUS_LABEL,
  TAGS_LABEL,
  TYPE_LABEL,
} from './filter_labels';

export function SelectedFilterPills({
  handleFilterChange,
  excludeFields,
}: {
  handleFilterChange: SyntheticsMonitorFilterChangeHandler;
  excludeFields?: ReadonlyArray<SyntheticsMonitorFilterField>;
}) {
  const urlParams = useGetUrlParams();
  const [, updateUrlParams] = useUrlParams();
  const { locations } = useSelector(selectServiceLocationsState);
  const excluded = new Set(excludeFields ?? []);

  const pillFields: Array<{ field: SyntheticsMonitorFilterField; label: string }> = [
    { field: 'monitorTypes', label: TYPE_LABEL },
    { field: 'locations', label: LOCATION_LABEL },
    { field: 'tags', label: TAGS_LABEL },
    { field: 'schedules', label: SCHEDULE_LABEL },
    { field: 'projects', label: PROJECT_LABEL },
    { field: 'remoteNames', label: getRemoteOriginFieldLabel() },
  ];

  const pills: Array<{ key: string; text: string; ariaLabel: string; onRemove: () => void }> = [];

  for (const { field, label: filterLabel } of pillFields) {
    if (excluded.has(field)) {
      continue;
    }

    const selectedLabels = getSyntheticsFilterDisplayValues(
      valueToLabelWithEmptyCount(urlParams[field]),
      field,
      locations
    ).map(({ label }) => label);

    for (const value of selectedLabels) {
      pills.push({
        key: `${field}-${value}`,
        text: selectedPillText(filterLabel, value),
        ariaLabel: removePillAriaLabel(filterLabel, value),
        onRemove: () => {
          const remaining = selectedLabels.filter((label) => label !== value);
          handleFilterChange(
            field,
            remaining.length > 0 ? remaining : undefined,
            Boolean(
              remaining.length &&
                isLogicalAndField(field) &&
                urlParams.useLogicalAndFor?.includes(field)
            )
          );
        },
      });
    }
  }

  if (urlParams.statusFilter) {
    const statusValue = formatStatusFilter(urlParams.statusFilter);
    pills.push({
      key: `statusFilter-${urlParams.statusFilter}`,
      text: selectedPillText(STATUS_LABEL, statusValue),
      ariaLabel: removePillAriaLabel(STATUS_LABEL, statusValue),
      onRemove: () => updateUrlParams({ statusFilter: undefined }),
    });
  }

  if (pills.length === 0 && !hasActiveMonitorFilters(urlParams)) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        {pills.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiBadgeGroup gutterSize="s">
              {pills.map((pill) => (
                <EuiBadge
                  key={pill.key}
                  color="hollow"
                  iconType="cross"
                  iconSide="right"
                  iconOnClick={pill.onRemove}
                  iconOnClickAriaLabel={pill.ariaLabel}
                  data-test-subj={`syntheticsSelectedFilterPill-${pill.key}`}
                >
                  {pill.text}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </EuiFlexItem>
        ) : null}
        <ClearAllFilters />
      </EuiFlexGroup>
    </>
  );
}

function formatStatusFilter(statusFilter: string): string {
  return statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
}

function selectedPillText(filterLabel: string, value: string): string {
  return i18n.translate('xpack.synthetics.monitorManagement.filter.selectedPillLabel', {
    defaultMessage: '{filterLabel}: {value}',
    values: { filterLabel, value },
  });
}

function removePillAriaLabel(filterLabel: string, value: string): string {
  return i18n.translate('xpack.synthetics.monitorManagement.filter.removePillAriaLabel', {
    defaultMessage: 'Remove {filterLabel} filter {value}',
    values: { filterLabel, value },
  });
}
