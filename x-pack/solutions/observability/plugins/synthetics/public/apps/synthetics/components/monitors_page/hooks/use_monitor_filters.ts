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
import type { OverviewStatusFilter } from '../../../../../../common/constants/monitor_management';
import {
  getHeartbeatLocationFilter,
  groupOverviewStatusFilterIds,
  overviewStatusFilterIdKey,
} from '../../../../../../common/lib';
import type { OverviewStatusFilterId } from '../../../../../../common/runtime_types';
import { kqlValuesClause } from '../../../utils/kql_values_clause';
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
// `undefined` means no status filter (do not narrow). `[]` means this status
// is selected but currently has no monitors (narrow to nothing). Those are
// not interchangeable — collapsing them would drop the empty-status sentinel.
const idsForStatusFilter = (
  overviewStatus: ReturnType<typeof selectOverviewStatus>['status'],
  statusFilter?: OverviewStatusFilter | string
): OverviewStatusFilterId[] | undefined => {
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
      return (overviewStatus?.disabledMonitorQueryIds ?? []).map((monitorQueryId) => ({
        monitorQueryId,
      }));
    default:
      return undefined;
  }
};

const groupFilterClause = ({
  remoteName,
  locationId,
  queryIds,
}: {
  remoteName?: string;
  locationId?: string;
  queryIds: string[];
}): estypes.QueryDslQueryContainer => {
  const filter: estypes.QueryDslQueryContainer[] = [{ terms: { 'monitor.id': queryIds } }];
  if (remoteName) {
    filter.push({ wildcard: { _index: `${remoteName}:*` } });
  }
  filter.push(...getHeartbeatLocationFilter({ field: 'observer.name', value: locationId }));

  if (remoteName) {
    return filter.length === 1 ? filter[0] : { bool: { filter } };
  }

  // Local/Heartbeat ids are not unique across linked clusters. The overview
  // chart searches `synthetics-*,*:synthetics-*`, so a bare `monitor.id` terms
  // query would also match a remote copy of the same id.
  return {
    bool: {
      filter,
      must_not: [{ wildcard: { _index: '*:*' } }],
    },
  };
};

const monitorIdQuery = (ids: OverviewStatusFilterId[]): estypes.QueryDslQueryContainer => {
  if (!ids.length) {
    return { terms: { 'monitor.id': [NO_MATCHING_MONITOR_ID] } };
  }

  const clauses = groupOverviewStatusFilterIds(ids).map(groupFilterClause);

  if (clauses.length === 1) {
    return clauses[0];
  }
  return { bool: { should: clauses, minimum_should_match: 1 } };
};

// The `monitor.id` scoping (status filter, or the schedules/AND-locations
// branch's `allIds`) is deliberately kept out of `useMonitorFilters`'s
// `UrlFilter[]` output and expressed as DSL here instead. `UrlFilter`s get
// serialized to a KQL string (`urlFiltersToKueryString`, or this plugin's own
// `kqlValuesClause`), and KQL's `field: ("a" or "b" or ...)` compiles to one
// `bool.should` clause *per value* — for a status covering more monitors than
// Elasticsearch's boolean-clause limit (commonly 1024), that errors instead of
// rendering. A `terms` query has no such per-value clause cost.
export const useOverviewMonitorFilterIds = (): OverviewStatusFilterId[] | undefined => {
  const { locations, schedules, statusFilter, useLogicalAndFor, query } = useGetUrlParams();
  const { status: overviewStatus } = useSelector(selectOverviewStatus);
  const allIds = overviewStatus?.allIds ?? [];
  const statusIds = idsForStatusFilter(overviewStatus, statusFilter);
  // `allIds` is already the search-filtered set when `query` is set (the
  // overview-status API applies the same search), so a `terms` clause on it
  // scopes pings *and* alerts without the ping-only `query_string` that
  // `getQueryFilters` would otherwise AND onto the annotation layer.
  const allIdKeys = new Set(allIds.map(overviewStatusFilterIdKey));

  // since schedule isn't available in heartbeat data, in that case we rely on monitor.id
  // We need to rely on monitor.id also for locations, because each heartbeat data only contains one location
  if (
    !isEmpty(schedules) ||
    (!isEmpty(locations) && useLogicalAndFor?.includes('locations')) ||
    Boolean(query)
  ) {
    // Intersect with the status filter (if any) rather than ignoring it —
    // otherwise selecting e.g. "Down" would stop narrowing anything once a
    // schedule or (AND-ed) location filter is also active. Match on the full
    // filter identity so two CCS/Heartbeat copies of the same query id are
    // not collapsed into one `monitor.id`.
    return statusIds
      ? statusIds.filter((id) => allIdKeys.has(overviewStatusFilterIdKey(id)))
      : allIds;
  }

  if (statusIds) {
    return statusIds;
  }

  return undefined;
};

export const useMonitorIdFilter = (): estypes.QueryDslQueryContainer | undefined => {
  const ids = useOverviewMonitorFilterIds();
  return ids ? monitorIdQuery(ids) : undefined;
};

/**
 * Alert-compatible KQL for the overview Alerts count destination. Mirrors the
 * count's UrlFilters + locations + lifecycle statuses. Monitor-id identity
 * stays a `terms` DSL on the count/chart — the alerts URL only accepts KQL,
 * and expanding the unpaginated ID set with `or` hits Elasticsearch's
 * boolean-clause limit (and can overflow the URL).
 */
export const useOverviewAlertsKuery = (): string => {
  const { locations } = useGetUrlParams();
  const alertsFilters = useMonitorFilters({ forAlerts: true });

  const clauses = [
    kqlValuesClause('kibana.alert.status', ['active', 'recovered']),
    ...alertsFilters
      .filter((filter) => Boolean(filter.values?.length))
      .map((filter) => kqlValuesClause(filter.field, filter.values ?? [])),
  ];
  if (locations?.length && !alertsFilters.some((filter) => filter.field === 'observer.geo.name')) {
    clauses.push(kqlValuesClause('observer.geo.name', getValues(locations)));
  }
  return clauses.join(' and ');
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
  const locationFilter: UrlFilter[] = locations?.length
    ? [{ field: 'observer.geo.name', values: getValues(locations) }]
    : [];

  // The schedules/AND-locations branch previously replaced every other filter
  // with a `monitor.id`-only one (`allIds` already reflects those constraints
  // server-side); that scoping now comes from `useMonitorIdFilter` instead.
  // Location still has to apply to ping/alert docs: local saved-object rows
  // group locations under one config, so a monitor.id terms query would
  // otherwise include pings from unselected locations.
  if (!isEmpty(schedules) || (!isEmpty(locations) && useLogicalAndFor?.includes('locations'))) {
    return [...locationFilter, ...spaceFilter];
  }

  return [
    ...(projects?.length ? [{ field: 'monitor.project.id', values: getValues(projects) }] : []),
    ...(monitorTypes?.length ? [{ field: 'monitor.type', values: getValues(monitorTypes) }] : []),
    ...createFiltersForField({
      useLogicalAnd: useLogicalAndFor?.includes('tags'),
      field: 'tags',
      values: tags,
    }),
    ...locationFilter,
    ...spaceFilter,
  ];
};

const getValues = (values: string | string[]): string[] => {
  return Array.isArray(values) ? values : [values];
};
