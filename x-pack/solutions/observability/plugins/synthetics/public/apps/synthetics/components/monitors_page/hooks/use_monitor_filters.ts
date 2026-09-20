/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { useSelector } from 'react-redux-v7';
import { isEmpty } from 'lodash';
import { useGetUrlParams } from '../../../hooks/use_url_params';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { selectOverviewStatus } from '../../../state/overview_status';

// A stable stand-in for "no monitor should match" (e.g. a status filter with
// no current monitors). Module-level and fixed rather than a fresh
// `uniqueId()` per render — a new value every render changes this hook's
// output identity every render too, and consumers like `useOverviewAlertsCount`
// key an async-fetch dependency array off that output (via `JSON.stringify`),
// so a fresh id here caused a continuous refetch/re-render loop.
const NO_MATCHING_MONITOR_ID = '__no_matching_monitor__';

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

// The paginated overview-status response only returns *page-sliced*
// `upConfigs`/`downConfigs`/etc — not the complete set of ids for a status,
// so a `statusFilter` can't be applied via those. `upIds`/`downIds`/`pendingIds`/
// `staleIds` are the unpaginated equivalents (mirroring `allIds`), added
// specifically so callers like this one can scope to "every monitor currently
// in status X", not just the page currently on screen.
const idsForStatusFilter = (
  overviewStatus: ReturnType<typeof selectOverviewStatus>['status'],
  statusFilter?: string
): string[] | undefined => {
  switch (statusFilter) {
    case 'up':
      return overviewStatus?.upIds ?? [];
    case 'down':
      return overviewStatus?.downIds ?? [];
    case 'pending':
      return overviewStatus?.pendingIds ?? [];
    case 'stale':
      return overviewStatus?.staleIds ?? [];
    case 'disabled':
      return overviewStatus?.disabledMonitorQueryIds ?? [];
    default:
      return undefined;
  }
};

// The `monitor.id` scoping (status filter, or the schedules/AND-locations
// branch's `allIds`) is deliberately kept out of `useMonitorFilters`'s
// `UrlFilter[]` output and expressed as DSL here instead. `UrlFilter`s get
// serialized to a KQL string (`urlFiltersToKueryString`, or this plugin's own
// `kqlValuesClause`), and KQL's `field: ("a" or "b" or ...)` compiles to one
// `bool.should` clause *per value* — for a status covering more monitors than
// Elasticsearch's boolean-clause limit (commonly 1024), that errors instead of
// rendering. A `terms` query has no such per-value clause cost.
export const useMonitorIdFilter = (): estypes.QueryDslQueryContainer | undefined => {
  const { locations, schedules, statusFilter, useLogicalAndFor } = useGetUrlParams();
  const { status: overviewStatus } = useSelector(selectOverviewStatus);
  const allIds = overviewStatus?.allIds ?? [];
  const statusIds = idsForStatusFilter(overviewStatus, statusFilter);

  // since schedule isn't available in heartbeat data, in that case we rely on monitor.id
  // We need to rely on monitor.id also for locations, because each heartbeat data only contains one location
  if (!isEmpty(schedules) || (!isEmpty(locations) && useLogicalAndFor?.includes('locations'))) {
    // Intersect with the status filter (if any) rather than ignoring it —
    // otherwise selecting e.g. "Down" would stop narrowing anything once a
    // schedule or (AND-ed) location filter is also active.
    const ids = statusIds ? allIds.filter((id) => statusIds.includes(id)) : allIds;
    // If ids is empty we return a fixed non-matching id just to not get any result.
    return { terms: { 'monitor.id': ids.length ? ids : [NO_MATCHING_MONITOR_ID] } };
  }

  if (statusIds) {
    return { terms: { 'monitor.id': statusIds.length ? statusIds : [NO_MATCHING_MONITOR_ID] } };
  }

  return undefined;
};

export const useMonitorFilters = ({ forAlerts }: { forAlerts?: boolean }): UrlFilter[] => {
  const { space } = useKibanaSpace();
  const { locations, monitorTypes, tags, projects, schedules, useLogicalAndFor } =
    useGetUrlParams();
  // Applied in every branch below — omitting it here (as the schedules/AND-locations
  // branch previously did) would leave nothing else to scope by, which for
  // alerts is not itself a space boundary: the alerts-as-data index isn't
  // guaranteed to scope by space just because a `monitor.id` value matches.
  const spaceFilter: UrlFilter[] = space
    ? [{ field: forAlerts ? 'kibana.space_ids' : 'meta.space_id', values: [space.id] }]
    : [];

  // The schedules/AND-locations branch previously replaced every other filter
  // with a `monitor.id`-only one (`allIds` already reflects those constraints
  // server-side); that scoping now comes from `useMonitorIdFilter` instead, so
  // this branch only has the space filter left to contribute.
  if (!isEmpty(schedules) || (!isEmpty(locations) && useLogicalAndFor?.includes('locations'))) {
    return spaceFilter;
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
    ...spaceFilter,
  ];
};

const getValues = (values: string | string[]): string[] => {
  return Array.isArray(values) ? values : [values];
};
