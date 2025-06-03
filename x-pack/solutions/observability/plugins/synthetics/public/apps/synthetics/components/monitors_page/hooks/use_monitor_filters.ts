/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { useSelector } from 'react-redux';
import { isEmpty, uniqueId } from 'lodash';
import { useGetUrlParams } from '../../../hooks/use_url_params';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { selectOverviewStatus } from '../../../state/overview_status';

const createFiltersForField = ({
  field,
  values,
  useLogicalAnd = false,
}: {
  field: string;
  values: string | string[] | undefined;
  useLogicalAnd?: boolean;
}): UrlFilter[] => {
  if (!values || !values.length) return [];

  const valueArray = getValues(values);

  return useLogicalAnd
    ? valueArray.map((value) => ({ field, values: [value] }))
    : [{ field, values: valueArray }];
};

export const useMonitorFilters = ({ forAlerts }: { forAlerts?: boolean }): UrlFilter[] => {
  const { space } = useKibanaSpace();
  const { locations, monitorTypes, tags, projects, schedules, useLogicalAndFor } =
    useGetUrlParams();
  const { status: overviewStatus } = useSelector(selectOverviewStatus);
  const allIds = overviewStatus?.allIds ?? [];

  // since schedule isn't available in heartbeat data, in that case we rely on monitor.id
  // We need to rely on monitor.id also for locations, because each heartbeat data only contains one location
  if (!isEmpty(schedules) || (!isEmpty(locations) && useLogicalAndFor?.includes('locations'))) {
    // If allIds is empty we return an array with a random id just to not get any result, there's probably a better solution
    return [{ field: 'monitor.id', values: allIds.length ? allIds : [uniqueId()] }];
  }

  return [
    ...(projects?.length ? [{ field: 'monitor.project.id', values: getValues(projects) }] : []),
    ...(monitorTypes?.length ? [{ field: 'monitor.type', values: getValues(monitorTypes) }] : []),
    ...createFiltersForField({
      useLogicalAnd: useLogicalAndFor?.includes('tags'),
      field: 'tags',
      values: tags,
    }),
    ...(locations?.length ? [{ field: 'observer.geo.name', values: getValues(locations) }] : []),
    ...(space
      ? [{ field: forAlerts ? 'kibana.space_ids' : 'meta.space_id', values: [space.id] }]
      : []),
  ];
};

const getValues = (values: string | string[]): string[] => {
  return Array.isArray(values) ? values : [values];
};
