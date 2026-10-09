/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux-v7';
import { useGetUrlParams } from '../../../../hooks';
import { selectServiceLocationsState } from '../../../../state';
import { selectOverviewStatus } from '../../../../state/overview_status';

import type {
  SyntheticsMonitorFilterItem,
  SyntheticsMonitorFilterChangeHandler,
  LabelWithCountValue,
} from '../../../../utils/filters/filter_fields';
import { getSyntheticsFilterDisplayValues } from '../../../../utils/filters/filter_fields';
import { useFilters } from './use_filters';
import { FilterButton } from './filter_button';

const mixUrlValues = (
  values?: LabelWithCountValue[],
  urlLabels?: string[] | string
): LabelWithCountValue[] => {
  let urlValues: Array<{
    label: string;
    count: number;
  }> = [];
  if (typeof urlLabels === 'string' && urlLabels) {
    urlValues.push({ label: urlLabels, count: 0 });
  } else if (Array.isArray(urlLabels)) {
    urlValues = urlLabels?.map((label) => ({ label, count: 0 })) ?? [];
  }
  const newValues = [...(values ?? [])];
  // add url values that are not in the values
  urlValues.forEach((urlValue) => {
    if (!newValues.find((value) => value.label === urlValue.label)) {
      newValues.push(urlValue);
    }
  });
  return newValues;
};

export const FilterGroup = ({
  handleFilterChange,
  excludeFields,
  showRemoteClusterFilter = false,
}: {
  handleFilterChange: SyntheticsMonitorFilterChangeHandler;
  /**
   * Fields to omit from the filter group. Useful on views (e.g. the global
   * Errors tab) where some monitor-config filters (like `schedules`) don't
   * apply because the data being filtered isn't backed by monitor configs.
   */
  excludeFields?: ReadonlyArray<SyntheticsMonitorFilterItem['field']>;
  /**
   * Whether to render the "Remote cluster" filter. Only meaningful on the
   * overview page (`MonitorListContainer` renders `FilterGroup` too via
   * `ListFilters`, but management cannot filter on `_index`). Hidden by
   * default and additionally gated on the presence of remote monitors.
   */
  showRemoteClusterFilter?: boolean;
}) => {
  const data = useFilters();

  const { locations } = useSelector(selectServiceLocationsState);
  const { allConfigs } = useSelector(selectOverviewStatus);

  const urlParams = useGetUrlParams();

  // Derive remote-cluster filter values from the overview status payload
  // (same source the grouping toggle uses). The filters endpoint only knows
  // about local saved objects, so it cannot enumerate remote clusters.
  const remoteClusterValues = useMemo<LabelWithCountValue[]>(() => {
    const counts = new Map<string, number>();
    for (const config of allConfigs ?? []) {
      const remoteName = config.remote?.remoteName;
      if (!remoteName) continue;
      counts.set(remoteName, (counts.get(remoteName) ?? 0) + 1);
    }
    return Array.from(counts, ([label, count]) => ({ label, count }));
  }, [allConfigs]);

  const hasRemoteMonitors = remoteClusterValues.length > 0;

  const allFilters: SyntheticsMonitorFilterItem[] = [
    {
      label: TYPE_LABEL,
      field: 'monitorTypes',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.monitorTypes, urlParams.monitorTypes),
        'monitorTypes',
        locations
      ),
    },
    {
      label: LOCATION_LABEL,
      field: 'locations',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(
          data?.locations.map((locationData) => {
            const matchingLocation = locations.find(
              (location) => location.id === locationData.label
            );
            return {
              label: matchingLocation ? matchingLocation.label : locationData.label,
              count: locationData.count,
            };
          }),
          urlParams.locations
        ),
        'locations',
        locations
      ),
    },
    {
      label: TAGS_LABEL,
      field: 'tags',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.tags, urlParams.tags),
        'tags',
        locations
      ),
    },
    {
      label: SCHEDULE_LABEL,
      field: 'schedules',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.schedules, urlParams.schedules),
        'schedules',
        locations
      ),
    },
  ];

  if ((data?.projects?.length || 0) > 0) {
    allFilters.push({
      label: PROJECT_LABEL,
      field: 'projects',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(data?.projects, urlParams.projects),
        'projects',
        locations
      ),
    });
  }

  if (showRemoteClusterFilter && hasRemoteMonitors) {
    allFilters.push({
      label: REMOTE_CLUSTER_LABEL,
      field: 'remoteNames',
      values: getSyntheticsFilterDisplayValues(
        mixUrlValues(remoteClusterValues, urlParams.remoteNames),
        'remoteNames',
        locations
      ),
    });
  }

  const excluded = new Set(excludeFields ?? []);
  const filters = allFilters.filter((f) => !excluded.has(f.field));

  return (
    <EuiFilterGroup>
      {filters.map((filter, index) => (
        <FilterButton
          key={index}
          filter={filter}
          handleFilterChange={handleFilterChange}
          loading={!data}
        />
      ))}
    </EuiFilterGroup>
  );
};

const TYPE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.typeLabel', {
  defaultMessage: `Type`,
});

const PROJECT_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.projectLabel', {
  defaultMessage: `Project`,
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.locationLabel', {
  defaultMessage: `Location`,
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.tagsLabel', {
  defaultMessage: `Tags`,
});

const SCHEDULE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.filter.frequencyLabel', {
  defaultMessage: `Frequency`,
});

const REMOTE_CLUSTER_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.filter.remoteClusterLabel',
  {
    defaultMessage: `Remote cluster`,
  }
);
