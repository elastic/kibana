/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { isEmpty } from 'lodash';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { OverviewStatusQuery } from '../common';
import { getMonitorFilters } from '../common';
import { processMonitors } from '../../saved_objects/synthetics_monitor/process_monitors';
import { ConfigKey } from '../../../common/constants/monitor_management';
import type { RouteContext } from '../types';
import type {
  EncryptedSyntheticsMonitorAttributes,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import {
  FINAL_SUMMARY_FILTER,
  getRangeFilter,
  getTimespanFilter,
} from '../../../common/constants/client_defaults';
import { isCCSEnabled, getRemoteMonitorInfo } from '../../lib/remote_result_utils';

interface LocationStatusEntry {
  status: string;
  locationId: string;
  timestamp: string;
  monitorUrl?: string;
  index?: string;
  kibanaUrl?: string;
  // Additional fields from ping docs, used to build metadata for remote-only monitors
  monitorName?: string;
  monitorType?: string;
  configId?: string;
  tags?: string[];
}

type LocationStatus = LocationStatusEntry[];

export const SUMMARIES_PAGE_SIZE = 5000;

export class OverviewStatusService {
  filterData: {
    locationIds?: string[] | string;
    filtersStr?: string;
  } = {};
  constructor(
    private readonly routeContext: RouteContext<Record<string, any>, OverviewStatusQuery>
  ) {}

  async getOverviewStatus() {
    this.filterData = await getMonitorFilters(this.routeContext);

    const [allConfigs, statusResult] = await Promise.all([
      this.getMonitorConfigs(),
      this.getQueryResult(),
    ]);

    const { up, down, pending, upConfigs, downConfigs, pendingConfigs, disabledConfigs } =
      this.processOverviewStatus(allConfigs, statusResult);

    const {
      enabledMonitorQueryIds,
      disabledMonitorQueryIds,
      allIds,
      disabledCount,
      disabledMonitorsCount,
      projectMonitorsCount,
    } = processMonitors(allConfigs, this.filterData?.locationIds);

    return {
      allIds,
      allMonitorsCount: allConfigs.length,
      disabledMonitorsCount,
      projectMonitorsCount,
      enabledMonitorQueryIds,
      disabledMonitorQueryIds,
      disabledCount,
      up,
      down,
      pending,
      upConfigs,
      downConfigs,
      pendingConfigs,
      disabledConfigs,
    };
  }

  getEsDataFilters() {
    const { spaceId, request } = this.routeContext;
    const params = request.query || {};
    const {
      scopeStatusByLocation = true,
      tags,
      monitorTypes,
      projects,
      showFromAllSpaces,
    } = params;
    const { locationIds } = this.filterData;
    const getTermFilter = (field: string, value: string | string[] | undefined) => {
      if (!value || isEmpty(value)) {
        return [];
      }
      if (Array.isArray(value)) {
        return [
          {
            terms: {
              [field]: value,
            },
          },
        ];
      }
      return [
        {
          term: {
            [field]: value,
          },
        },
      ];
    };
    // When CCS is enabled, skip the meta.space_id filter entirely.
    // Remote pings from other Kibana instances have their own space_id values
    // that won't match the local Kibana's space. Space scoping for local monitors
    // is already handled by the saved objects query in getMonitorConfigs().
    const ccsEnabled = isCCSEnabled(this.routeContext.server);
    const skipSpaceFilter = showFromAllSpaces || ccsEnabled;

    const filters: QueryDslQueryContainer[] = [
      ...(skipSpaceFilter ? [] : [{ terms: { 'meta.space_id': [spaceId, ALL_SPACES_ID] } }]),
      ...getTermFilter('monitor.type', monitorTypes),
      ...getTermFilter('tags', tags),
      ...getTermFilter('monitor.project.id', projects),
    ];

    if (scopeStatusByLocation && !isEmpty(locationIds) && locationIds) {
      filters.push({
        terms: {
          'observer.name': locationIds,
        },
      });
    }
    return filters;
  }

  async getQueryResult() {
    const ccsEnabled = isCCSEnabled(this.routeContext.server);

    return withApmSpan('monitor_status_data', async () => {
      const range = {
        // max monitor schedule period is 4 hours, 20 minute subtraction is to be on safe side
        from: moment().subtract(4, 'hours').subtract(20, 'minutes').toISOString(),
        to: 'now',
      };

      let hasMoreData = true;
      const monitorByIds = new Map<string, LocationStatus>();
      let afterKey: any;
      let count = 0;

      const topMetricsFields = [
        { field: 'monitor.status' },
        { field: 'url.full.keyword' },
        // When CCS is enabled, retrieve additional fields to detect remote monitors,
        // build deep links, and construct metadata for remote-only monitors
        // (which have no local saved object).
        // Note: _index is NOT included here because top_metrics does not support
        // metadata fields. We use a separate terms sub-aggregation for _index instead.
        // observer.geo.name is also excluded because it is a wildcard type field
        // which top_metrics cannot collect. We fall back to locationId for remote monitors.
        ...(ccsEnabled
          ? [
              { field: 'kibanaUrl' },
              { field: 'monitor.name' },
              { field: 'monitor.type' },
              { field: 'config_id' },
              { field: 'tags' },
            ]
          : []),
      ];

      do {
        const result = await this.routeContext.syntheticsEsClient.search(
          {
            size: 0,
            query: {
              bool: {
                filter: [
                  FINAL_SUMMARY_FILTER,
                  getRangeFilter({ from: range.from, to: range.to }),
                  getTimespanFilter({ from: 'now-15m', to: 'now' }),
                  ...this.getEsDataFilters(),
                ] as QueryDslQueryContainer[],
              },
            },
            aggs: {
              monitors: {
                composite: {
                  size: SUMMARIES_PAGE_SIZE,
                  sources: asMutableArray([
                    {
                      monitorId: {
                        terms: {
                          field: 'monitor.id',
                        },
                      },
                    },
                    {
                      locationId: {
                        terms: {
                          field: 'observer.name',
                        },
                      },
                    },
                  ] as const),
                  after: afterKey,
                },
                aggs: {
                  status: {
                    top_metrics: {
                      metrics: topMetricsFields,
                      sort: {
                        '@timestamp': 'desc',
                      },
                    },
                  },
                  // _index is a metadata field not supported by top_metrics,
                  // so we use a separate terms agg to determine the source index.
                  // For a given monitor+location bucket the latest ping typically
                  // comes from a single index, so size:1 is sufficient.
                  ...(ccsEnabled
                    ? {
                        index_name: {
                          terms: {
                            field: '_index',
                            size: 1,
                          },
                        },
                      }
                    : {}),
                },
              },
            },
          },
          'getCurrentStatusOverview' + count
        );
        count += 1;
        const data = result.body.aggregations?.monitors;

        hasMoreData = (data?.buckets ?? []).length >= SUMMARIES_PAGE_SIZE;
        afterKey = data?.after_key;

        data?.buckets.forEach(({ status: statusAgg, key: bKey, ...rest }) => {
          const monitorId = String(bKey.monitorId);
          const locationId = String(bKey.locationId);
          const metrics = statusAgg.top?.[0].metrics;
          const status = String(metrics?.['monitor.status']);
          const monitorUrl = metrics?.['url.full.keyword'];

          const timestamp = String(statusAgg.top[0].sort[0]);
          if (!monitorByIds.has(String(monitorId))) {
            monitorByIds.set(monitorId, []);
          }

          // _index comes from the terms sub-agg, not top_metrics
          const indexNameAgg = ccsEnabled ? (rest as any).index_name : undefined;
          const indexName = indexNameAgg?.buckets?.[0]?.key;
          const kibanaUrl = ccsEnabled ? metrics?.kibanaUrl : undefined;
          const monitorName = ccsEnabled ? metrics?.['monitor.name'] : undefined;
          const monitorType = ccsEnabled ? metrics?.['monitor.type'] : undefined;
          const configId = ccsEnabled ? metrics?.config_id : undefined;
          const tags = ccsEnabled ? metrics?.tags : undefined;

          monitorByIds.get(monitorId)?.push({
            status,
            locationId,
            timestamp,
            monitorUrl: monitorUrl ? String(monitorUrl) : undefined,
            ...(indexName ? { index: String(indexName) } : {}),
            ...(kibanaUrl ? { kibanaUrl: String(kibanaUrl) } : {}),
            ...(monitorName ? { monitorName: String(monitorName) } : {}),
            ...(monitorType ? { monitorType: String(monitorType) } : {}),
            ...(configId ? { configId: String(configId) } : {}),
            ...(tags ? { tags: Array.isArray(tags) ? tags.map(String) : [String(tags)] } : {}),
          });
        });
      } while (hasMoreData && afterKey);
      return monitorByIds;
    });
  }

  processOverviewStatus(
    monitors: Array<
      SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes & { [ConfigKey.URLS]?: string }>
    >,
    statusData: Map<string, LocationStatus>
  ) {
    let up = 0;
    let down = 0;
    const upConfigs: Record<string, OverviewStatusMetaData> = {};
    const downConfigs: Record<string, OverviewStatusMetaData> = {};
    const pendingConfigs: Record<string, OverviewStatusMetaData> = {};
    const disabledConfigs: Record<string, OverviewStatusMetaData> = {};

    const enabledMonitors = monitors.filter((monitor) => monitor.attributes[ConfigKey.ENABLED]);
    const disabledMonitors = monitors.filter((monitor) => !monitor.attributes[ConfigKey.ENABLED]);

    const queryLocIds = this.filterData?.locationIds;

    // Track which monitor IDs have been processed via local saved objects
    const processedMonitorIds = new Set<string>();

    disabledMonitors.forEach((monitor) => {
      const monitorQueryId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      const meta = this.getMonitorMeta(monitor);
      processedMonitorIds.add(monitorQueryId);
      monitor.attributes[ConfigKey.LOCATIONS]?.forEach((location) => {
        disabledConfigs[`${meta.configId}-${location.id}`] = {
          monitorQueryId,
          status: 'disabled',
          locationId: location.id,
          locationLabel: location.label,
          ...meta,
        };
      });
    });

    enabledMonitors.forEach((monitor) => {
      const monitorId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      processedMonitorIds.add(monitorId);
      const monitorStatus = statusData.get(monitorId);

      // discard any locations that are not in the monitorLocationsMap for the given monitor as well as those which are
      // in monitorLocationsMap but not in listOfLocations
      const monLocations = monitor.attributes[ConfigKey.LOCATIONS];
      monLocations?.forEach((monLocation) => {
        if (!isEmpty(queryLocIds) && !queryLocIds?.includes(monLocation.id)) {
          // filter out location provided via query
          return;
        }
        const locData = monitorStatus?.find((loc) => loc.locationId === monLocation.id);
        const metaInfo = this.getMonitorMeta(monitor);
        const remote = locData?.index
          ? getRemoteMonitorInfo(locData.index, locData.kibanaUrl)
          : undefined;
        const meta = {
          ...metaInfo,
          monitorQueryId: monitorId,
          locationId: monLocation.id,
          timestamp: locData?.timestamp,
          locationLabel: monLocation.label,
          urls: monitor.attributes[ConfigKey.URLS] || locData?.monitorUrl,
          ...(remote ? { remote } : {}),
        };
        const monLocId = `${meta.configId}-${monLocation.id}`;
        if (locData) {
          if (locData.status === 'down') {
            down += 1;
            downConfigs[monLocId] = {
              ...meta,
              status: 'down',
            };
          } else if (locData.status === 'up') {
            up += 1;
            upConfigs[monLocId] = {
              ...meta,
              status: 'up',
            };
          }
        } else {
          pendingConfigs[monLocId] = {
            status: 'unknown',
            ...meta,
          };
        }
      });
    });

    // Process remote-only monitors: pings from CCS indices that have no local saved object.
    // These monitors exist only on remote clusters and are discovered purely from ping data.
    if (isCCSEnabled(this.routeContext.server)) {
      statusData.forEach((locationStatuses, monitorId) => {
        if (processedMonitorIds.has(monitorId)) {
          return; // Already processed via local saved object
        }

        locationStatuses.forEach((locData) => {
          const remote = locData.index
            ? getRemoteMonitorInfo(locData.index, locData.kibanaUrl)
            : undefined;

          // Only include if this is actually a remote ping
          if (!remote) {
            return;
          }

          if (!isEmpty(queryLocIds) && !queryLocIds?.includes(locData.locationId)) {
            return;
          }

          const configId = locData.configId || monitorId;
          const meta: OverviewStatusMetaData = {
            monitorQueryId: monitorId,
            configId,
            name: locData.monitorName || monitorId,
            type: locData.monitorType || 'unknown',
            status: locData.status,
            locationId: locData.locationId,
            locationLabel: locData.locationId,
            schedule: '',
            tags: locData.tags ?? [],
            isEnabled: true,
            isStatusAlertEnabled: false,
            timestamp: locData.timestamp,
            urls: locData.monitorUrl,
            remote,
          };

          const monLocId = `${configId}-${locData.locationId}`;
          if (locData.status === 'down') {
            down += 1;
            downConfigs[monLocId] = meta;
          } else if (locData.status === 'up') {
            up += 1;
            upConfigs[monLocId] = meta;
          } else {
            pendingConfigs[monLocId] = { ...meta, status: 'unknown' };
          }
        });
      });
    }

    return {
      up,
      down,
      pending: Object.values(pendingConfigs).length,
      upConfigs,
      downConfigs,
      pendingConfigs,
      disabledConfigs,
    };
  }

  async getMonitorConfigs() {
    const { request } = this.routeContext;
    const { query, showFromAllSpaces } = request.query || {};
    /**
     * Walk through all monitor saved objects, bucket IDs by disabled/enabled status.
     *
     * Track max period to make sure the snapshot query should reach back far enough to catch
     * latest ping for all enabled monitors.
     */

    const { filtersStr } = this.filterData;

    return this.routeContext.monitorConfigRepository.getAll<
      EncryptedSyntheticsMonitorAttributes & { [ConfigKey.URLS]?: string }
    >({
      showFromAllSpaces,
      search: query,
      filter: filtersStr,
      fields: [
        ConfigKey.ENABLED,
        ConfigKey.LOCATIONS,
        ConfigKey.MONITOR_QUERY_ID,
        ConfigKey.CONFIG_ID,
        ConfigKey.SCHEDULE,
        ConfigKey.MONITOR_SOURCE_TYPE,
        ConfigKey.MONITOR_TYPE,
        ConfigKey.NAME,
        ConfigKey.TAGS,
        ConfigKey.PROJECT_ID,
        ConfigKey.ALERT_CONFIG,
        ConfigKey.URLS,
        ConfigKey.MAINTENANCE_WINDOWS,
      ],
    });
  }

  getMonitorMeta(
    monitor: SavedObjectsFindResult<
      EncryptedSyntheticsMonitorAttributes & { [ConfigKey.URLS]?: string }
    >
  ) {
    return {
      name: monitor.attributes[ConfigKey.NAME],
      configId: monitor.attributes[ConfigKey.CONFIG_ID],
      schedule: monitor.attributes[ConfigKey.SCHEDULE].number,
      tags: monitor.attributes[ConfigKey.TAGS],
      isEnabled: monitor.attributes[ConfigKey.ENABLED],
      type: monitor.attributes[ConfigKey.MONITOR_TYPE],
      projectId: monitor.attributes[ConfigKey.PROJECT_ID],
      isStatusAlertEnabled: isStatusEnabled(monitor.attributes[ConfigKey.ALERT_CONFIG]),
      updated_at: monitor.updated_at,
      spaces: monitor.namespaces,
      urls: monitor.attributes[ConfigKey.URLS],
      maintenanceWindows: monitor.attributes[ConfigKey.MAINTENANCE_WINDOWS]?.map((mw) => mw),
    };
  }
}
