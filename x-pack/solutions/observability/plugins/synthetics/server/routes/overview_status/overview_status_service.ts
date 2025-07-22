/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { isEmpty } from 'lodash';
import { withApmSpan } from '@kbn/apm-data-access-plugin/server/utils/with_apm_span';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { getMonitorFilters, OverviewStatusQuery } from '../common';
import { ConfigKey, MONITOR_STATUS_ENUM } from '../../../common/constants/monitor_management';
import { processMonitors } from '../../saved_objects/synthetics_monitor/process_monitors';
import { RouteContext } from '../types';
import {
  EncryptedSyntheticsMonitorAttributes,
  OverviewStatusMetaData,
} from '../../../common/runtime_types';
import { isStatusEnabled } from '../../../common/runtime_types/monitor_management/alert_config';
import {
  FINAL_SUMMARY_FILTER,
  getRangeFilter,
  getTimespanFilter,
} from '../../../common/constants/client_defaults';

type LocationStatus = Array<{
  status: string;
  locationId: string;
  timestamp: string;
  monitorUrl?: string;
}>;

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
    const filters: QueryDslQueryContainer[] = [
      ...(showFromAllSpaces ? [] : [{ terms: { 'meta.space_id': [spaceId, ALL_SPACES_ID] } }]),
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
                      metrics: [
                        {
                          field: 'monitor.status',
                        },
                        {
                          field: 'url.full.keyword',
                        },
                      ],
                      sort: {
                        '@timestamp': 'desc',
                      },
                    },
                  },
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

        data?.buckets.forEach(({ status: statusAgg, key: bKey }) => {
          const monitorId = String(bKey.monitorId);
          const locationId = String(bKey.locationId);
          const status = String(statusAgg.top?.[0].metrics?.['monitor.status']);
          const monitorUrl = String(statusAgg.top?.[0].metrics?.['url.full.keyword']);

          const timestamp = String(statusAgg.top[0].sort[0]);
          if (!monitorByIds.has(String(monitorId))) {
            monitorByIds.set(monitorId, []);
          }
          monitorByIds.get(monitorId)?.push({
            status,
            locationId,
            timestamp,
            monitorUrl: monitorUrl ? String(monitorUrl) : undefined,
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

    disabledMonitors.forEach((monitor) => {
      const monitorQueryId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
      const meta = this.getMonitorMeta(monitor);
      monitor.attributes[ConfigKey.LOCATIONS]?.forEach((location) => {
        if (disabledConfigs[meta.configId]) {
          disabledConfigs[meta.configId].locations.push({
            id: location.id,
            label: location.label,
            status: MONITOR_STATUS_ENUM.DISABLED,
          });
        } else {
          disabledConfigs[meta.configId] = {
            monitorQueryId,
            overallStatus: MONITOR_STATUS_ENUM.DISABLED,
            locations: [
              {
                id: location.id,
                label: location.label,
                status: MONITOR_STATUS_ENUM.DISABLED,
              },
            ],
            ...meta,
          };
        }
      });
    });

    enabledMonitors.forEach((monitor) => {
      const monitorId = monitor.attributes[ConfigKey.MONITOR_QUERY_ID];
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
        const status = locData?.status || MONITOR_STATUS_ENUM.PENDING;
        const location = {
          status,
          id: monLocation.id,
          label: monLocation.label,
        };
        const meta = {
          ...metaInfo,
          monitorQueryId: monitorId,
          timestamp: locData?.timestamp,
          urls: monitor.attributes[ConfigKey.URLS] || locData?.monitorUrl,
          locations: [location],
          overallStatus: status,
        };
        switch (status) {
          case MONITOR_STATUS_ENUM.DOWN:
            down += 1;
            break;
          case MONITOR_STATUS_ENUM.UP:
            up += 1;
            break;
          default:
            break;
        }

        if (
          downConfigs[meta.configId] ||
          upConfigs[meta.configId] ||
          pendingConfigs[meta.configId]
        ) {
          const existingMeta =
            downConfigs[meta.configId] || upConfigs[meta.configId] || pendingConfigs[meta.configId];
          existingMeta.locations.push(location);
          // check if urls is missing from existing meta and update it
          if (!existingMeta.urls && meta.urls) {
            existingMeta.urls = meta.urls;
          }
          // also update timestamp if it is missing or older
          if (
            !existingMeta.timestamp ||
            (meta.timestamp && moment(meta.timestamp).isAfter(existingMeta.timestamp))
          ) {
            existingMeta.timestamp = meta.timestamp;
          }
          if (status === MONITOR_STATUS_ENUM.DOWN) {
            existingMeta.overallStatus = MONITOR_STATUS_ENUM.DOWN;
          }
        } else {
          switch (status) {
            case MONITOR_STATUS_ENUM.DOWN:
              downConfigs[meta.configId] = meta;
              break;
            case MONITOR_STATUS_ENUM.UP:
              upConfigs[meta.configId] = meta;
              break;
            default:
              pendingConfigs[meta.configId] = meta;
              break;
          }
        }
      });
    });
    // check if any pending config have any up/down location, move it there instead of keeping it in pending and delete it from pending
    Object.values(pendingConfigs).forEach((pendingMeta) => {
      if (pendingMeta.locations.some((loc) => loc.status === MONITOR_STATUS_ENUM.DOWN)) {
        down += 1;
        // sort locations and move pending to end
        pendingMeta.locations = movePendingToEnd(pendingMeta.locations);
        downConfigs[pendingMeta.configId] = pendingMeta;
        delete pendingConfigs[pendingMeta.configId];
      } else if (pendingMeta.locations.some((loc) => loc.status === MONITOR_STATUS_ENUM.UP)) {
        up += 1;
        upConfigs[pendingMeta.configId] = pendingMeta;
        pendingMeta.overallStatus = MONITOR_STATUS_ENUM.UP;
        // sort locations and move pending to end
        pendingMeta.locations = movePendingToEnd(pendingMeta.locations);
        delete pendingConfigs[pendingMeta.configId];
      }
    });

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
      search: query ? `${query}*` : '',
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

function movePendingToEnd(locations: Array<{ id: string; label: string; status: string }>) {
  return locations.sort((a, b) => {
    if (a.status === MONITOR_STATUS_ENUM.PENDING && b.status !== MONITOR_STATUS_ENUM.PENDING) {
      return 1;
    }
    if (b.status === MONITOR_STATUS_ENUM.PENDING && a.status !== MONITOR_STATUS_ENUM.PENDING) {
      return -1;
    }
    return 0;
  });
}
