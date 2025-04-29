/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, Type, TypeOf } from '@kbn/config-schema';
import { SavedObjectsFindResponse } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { escapeQuotes } from '@kbn/es-query';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { useLogicalAndFields } from '../../common/constants';
import { RouteContext } from './types';
import { MonitorSortFieldSchema } from '../../common/runtime_types/monitor_management/sort_field';
import { getAllLocations } from '../synthetics_service/get_all_locations';
import { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import { PrivateLocation, ServiceLocation } from '../../common/runtime_types';
import { monitorAttributes, syntheticsMonitorType } from '../../common/types/saved_objects';

const StringOrArraySchema = schema.maybe(
  schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
);

const UseLogicalAndFieldLiterals = useLogicalAndFields.map((f) => schema.literal(f)) as [
  Type<string>
];

const CommonQuerySchema = {
  query: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  tags: StringOrArraySchema,
  monitorTypes: StringOrArraySchema,
  locations: StringOrArraySchema,
  projects: StringOrArraySchema,
  schedules: StringOrArraySchema,
  status: StringOrArraySchema,
  monitorQueryIds: StringOrArraySchema,
  showFromAllSpaces: schema.maybe(schema.boolean()),
  useLogicalAndFor: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.oneOf(UseLogicalAndFieldLiterals))])
  ),
};

export const QuerySchema = schema.object({
  ...CommonQuerySchema,
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
  sortField: MonitorSortFieldSchema,
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
  searchAfter: schema.maybe(schema.arrayOf(schema.string())),
  internal: schema.maybe(
    schema.boolean({
      defaultValue: false,
    })
  ),
});

export type MonitorsQuery = TypeOf<typeof QuerySchema>;

export const OverviewStatusSchema = schema.object({
  ...CommonQuerySchema,
  scopeStatusByLocation: schema.maybe(schema.boolean()),
});

export type OverviewStatusQuery = TypeOf<typeof OverviewStatusSchema>;

export const SEARCH_FIELDS = [
  'name',
  'tags.text',
  'locations.id.text',
  'locations.label',
  'urls',
  'hosts',
  'project_id.text',
];

export const getMonitors = async (
  context: RouteContext<MonitorsQuery>,
  { fields }: { fields?: string[] } = {}
): Promise<SavedObjectsFindResponse<EncryptedSyntheticsMonitorAttributes>> => {
  const {
    perPage = 50,
    page,
    sortField,
    sortOrder,
    query,
    searchAfter,
    showFromAllSpaces,
  } = context.request.query;

  const { filtersStr } = await getMonitorFilters(context);

  return context.savedObjectsClient.find({
    type: syntheticsMonitorType,
    perPage,
    page,
    sortField: parseMappingKey(sortField),
    sortOrder,
    searchFields: SEARCH_FIELDS,
    search: query ? `${query}*` : undefined,
    filter: filtersStr,
    searchAfter,
    fields,
    ...(showFromAllSpaces && { namespaces: ['*'] }),
  });
};

interface Filters {
  filter?: string;
  tags?: string | string[];
  monitorTypes?: string | string[];
  locations?: string | string[];
  projects?: string | string[];
  schedules?: string | string[];
  monitorQueryIds?: string | string[];
  configIds?: string | string[];
}

export const getMonitorFilters = async (
  context: RouteContext<Record<string, any>, OverviewStatusQuery>
) => {
  const {
    tags,
    monitorTypes,
    filter = '',
    projects,
    schedules,
    monitorQueryIds,
    locations: queryLocations,
    useLogicalAndFor,
  } = context.request.query;
  const locations = await parseLocationFilter(context, queryLocations);

  return parseArrayFilters(
    {
      filter,
      tags,
      monitorTypes,
      projects,
      schedules,
      monitorQueryIds,
      locations,
    },
    useLogicalAndFor
  );
};

export const parseArrayFilters = (
  {
    tags,
    filter,
    configIds,
    projects,
    monitorTypes,
    schedules,
    monitorQueryIds,
    locations,
  }: Filters,
  useLogicalAndFor: MonitorsQuery['useLogicalAndFor'] = []
) => {
  const filtersStr = [
    filter,
    getSavedObjectKqlFilter({
      field: 'tags',
      values: tags,
      operator: useLogicalAndFor.includes('tags') ? 'AND' : 'OR',
    }),
    getSavedObjectKqlFilter({ field: 'project_id', values: projects }),
    getSavedObjectKqlFilter({ field: 'type', values: monitorTypes }),
    getSavedObjectKqlFilter({
      field: 'locations.id',
      values: locations,
      operator: useLogicalAndFor.includes('locations') ? 'AND' : 'OR',
    }),
    getSavedObjectKqlFilter({ field: 'schedule.number', values: schedules }),
    getSavedObjectKqlFilter({ field: 'id', values: monitorQueryIds }),
    getSavedObjectKqlFilter({ field: 'config_id', values: configIds }),
  ]
    .filter((f) => !!f)
    .join(' AND ');

  return { filtersStr, locationIds: locations };
};

export const getSavedObjectKqlFilter = ({
  field,
  values,
  operator = 'OR',
  searchAtRoot = false,
}: {
  field: string;
  values?: string | string[];
  operator?: string;
  searchAtRoot?: boolean;
}) => {
  if (values === 'All' || (Array.isArray(values) && values?.includes('All'))) {
    return undefined;
  }

  if (isEmpty(values) || !values) {
    return '';
  }
  let fieldKey = '';
  if (searchAtRoot) {
    fieldKey = `${field}`;
  } else {
    fieldKey = `${monitorAttributes}.${field}`;
  }

  if (Array.isArray(values)) {
    return `${fieldKey}:(${values
      .map((value) => `"${escapeQuotes(value)}"`)
      .join(` ${operator} `)})`;
  }

  return `${fieldKey}:"${escapeQuotes(values)}"`;
};

export const parseLocationFilter = async (
  {
    syntheticsMonitorClient,
    savedObjectsClient,
    server,
  }: Pick<RouteContext, 'syntheticsMonitorClient' | 'savedObjectsClient' | 'server'>,
  locations?: string | string[]
) => {
  if (!locations || locations?.length === 0) {
    return;
  }

  const { allLocations } = await getAllLocations({
    syntheticsMonitorClient,
    savedObjectsClient,
    server,
    excludeAgentPolicies: true,
  });

  if (Array.isArray(locations)) {
    return locations
      .map((loc) => findLocationItem(loc, allLocations)?.id ?? '')
      .filter((val) => !!val);
  }

  return [findLocationItem(locations, allLocations)?.id ?? ''];
};

export const findLocationItem = (
  query: string,
  locations: Array<ServiceLocation | PrivateLocation>
) => {
  return locations.find(({ id, label }) => query === id || label === query);
};

/**
 * Returns whether the query is likely to return a subset of monitor objects.
 * Useful where `absoluteTotal` needs to be determined with a separate call
 * @param monitorQuery { MonitorsQuery }
 */
export const isMonitorsQueryFiltered = (monitorQuery: MonitorsQuery) => {
  const {
    query,
    tags,
    monitorTypes,
    locations,
    status,
    filter,
    projects,
    schedules,
    monitorQueryIds,
  } = monitorQuery;

  return (
    !!query ||
    !!filter ||
    !!locations?.length ||
    !!monitorTypes?.length ||
    !!tags?.length ||
    !!status?.length ||
    !!projects?.length ||
    !!schedules?.length ||
    !!monitorQueryIds?.length
  );
};

function parseMappingKey(key: string | undefined) {
  switch (key) {
    case 'schedule.keyword':
      return 'schedule.number';
    case 'project_id.keyword':
      return 'project_id';
    default:
      return key;
  }
}

export const validateRouteSpaceName = async (routeContext: RouteContext) => {
  const { spaceId, server, request, response } = routeContext;
  if (spaceId === DEFAULT_SPACE_ID) {
    // default space is always valid
    return { spaceId: DEFAULT_SPACE_ID };
  }

  try {
    await server.spaces?.spacesService.getActiveSpace(request);
  } catch (error) {
    if (error.output?.statusCode === 404) {
      return {
        spaceId,
        invalidResponse: response.notFound({
          body: { message: `Kibana space '${spaceId}' does not exist` },
        }),
      };
    }
  }

  return { invalidResponse: undefined };
};
