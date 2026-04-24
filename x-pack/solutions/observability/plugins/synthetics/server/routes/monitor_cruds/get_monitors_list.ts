/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EncryptedSyntheticsMonitorAttributes,
  RemoteMonitorListItem,
} from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { mapSavedObjectToMonitor } from './formatters/saved_object_to_monitor';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { MonitorsQuery } from '../common';
import {
  getMonitorFilters,
  isMonitorsQueryFiltered,
  parseMappingKey,
  QuerySchema,
  MONITOR_SEARCH_FIELDS,
} from '../common';
import { isCCSEnabled } from '../../lib/remote_result_utils';
import { getRemoteMonitorsList } from './get_remote_monitors_list';

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
    const {
      request,
      server,
      syntheticsEsClient,
      syntheticsMonitorClient,
      monitorConfigRepository,
    } = routeContext;
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
        searchFields: MONITOR_SEARCH_FIELDS,
        search: queryParams.query,
        filter: filtersStr,
        searchAfter: queryParams.searchAfter,
        ...(queryParams.showFromAllSpaces && { namespaces: ['*'] }),
      }),
      totalCountQuery(),
    ]);

    const absoluteTotal = totalCount?.total ?? queryResultSavedObjects.total;

    const { saved_objects: savedObjects, per_page: perPageT, ...rest } = queryResultSavedObjects;

    const monitors = savedObjects.map((monitor) => {
      const mon = mapSavedObjectToMonitor({
        monitor,
        internal: request.query?.internal,
      });
      return {
        ...mon,
        spaceId: monitor.namespaces?.[0],
        spaces: monitor.namespaces ?? [],
      };
    });

    // When CCS is enabled, also fetch remote-only monitors from ping data.
    // We need ALL local config IDs (not just the current page) to correctly
    // identify remote-only monitors, and we paginate them after local monitors.
    // Wrapped in try-catch so a CCS failure doesn't break the management page.
    let remoteMonitors: RemoteMonitorListItem[] | undefined;
    let remoteTotal = 0;
    if (isCCSEnabled(server)) {
      try {
        // Fetch all local config IDs to correctly exclude monitors that exist locally
        const allLocalMonitors = await monitorConfigRepository.getAll({
          fields: [ConfigKey.CONFIG_ID],
        });
        const localConfigIds = new Set(
          allLocalMonitors.map((so) => so.attributes[ConfigKey.CONFIG_ID])
        );
        const allRemote = await getRemoteMonitorsList({
          syntheticsEsClient,
          localConfigIds,
        });
        remoteTotal = allRemote.length;

        // Paginate remote monitors after local ones.
        // Remote monitors logically come after all local monitors in the list.
        const localTotal = queryResultSavedObjects.total;
        const perPage = queryParams.perPage ?? 50;
        const page = queryParams.page ?? 1;
        const pageStart = (page - 1) * perPage; // absolute offset of current page
        const pageEnd = pageStart + perPage;

        if (remoteTotal > 0 && pageEnd > localTotal) {
          // This page overlaps with the remote monitors region
          const remoteStart = Math.max(0, pageStart - localTotal);
          const remoteEnd = pageEnd - localTotal;
          remoteMonitors = allRemote.slice(remoteStart, remoteEnd);
        }
      } catch (e) {
        server.logger.error(`Failed to fetch remote monitors list: ${e.message}`);
      }
    }

    // Include remote monitor count in totals so frontend pagination is correct
    const totalWithRemote = queryResultSavedObjects.total + remoteTotal;
    const absoluteTotalWithRemote = absoluteTotal + remoteTotal;

    return {
      ...rest,
      total: totalWithRemote,
      monitors,
      absoluteTotal: absoluteTotalWithRemote,
      perPage: perPageT,
      syncErrors: syntheticsMonitorClient.syntheticsService.syncErrors,
      ...(remoteMonitors && remoteMonitors.length > 0 ? { remoteMonitors } : {}),
    };
  },
});
