/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  getMonitorFilters,
  isMonitorsQueryFiltered,
  MonitorsQuery,
  parseMappingKey,
  QuerySchema,
  SEARCH_FIELDS,
} from '../common';

export const getAllSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {},
  validation: {
    request: {
      query: QuerySchema,
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, syntheticsMonitorClient, monitorConfigRepository } = routeContext;
    const totalCountQuery = async () => {
      if (isMonitorsQueryFiltered(request.query)) {
        return monitorConfigRepository.find({
          perPage: 0,
          page: 1,
        });
      }
    };
    const queryParams = routeContext.request.query as MonitorsQuery;

    const { filtersStr } = await getMonitorFilters(routeContext);

    const [queryResultSavedObjects, totalCount] = await Promise.all([
      monitorConfigRepository.find<EncryptedSyntheticsMonitorAttributes>({
        perPage: queryParams.perPage ?? 50,
        page: queryParams.page ?? 1,
        sortField: parseMappingKey(queryParams.sortField),
        sortOrder: queryParams.sortOrder,
        searchFields: SEARCH_FIELDS,
        search: queryParams.query,
        filter: filtersStr,
        searchAfter: queryParams.searchAfter,
        ...(queryParams.showFromAllSpaces && { namespaces: ['*'] }),
      }),
      totalCountQuery(),
    ]);

    const absoluteTotal = totalCount?.total ?? queryResultSavedObjects.total;

    const { saved_objects: savedObjects, per_page: perPageT, ...rest } = queryResultSavedObjects;

    return {
      ...rest,
      monitors: savedObjects.map((monitor) => {
        const mon = mapSavedObjectToMonitor({
          monitor,
          internal: request.query?.internal,
        });
        return {
          ...mon,
          spaceId: monitor.namespaces?.[0],
          spaces: monitor.namespaces ?? [],
        };
      }),
      absoluteTotal,
      perPage: perPageT,
      syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
    };
  },
});
