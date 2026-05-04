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
import { ConfigKey, MONITOR_STATUS_ENUM } from '../../../common/constants/monitor_management';
import { processMonitors } from '../../saved_objects/synthetics_monitor/process_monitors';
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
  monitorIntervalSeconds?: number;
  configId?: string;
  tags?: string[];
  // Human-readable location label from observer.geo.name. Resolved via a
  // terms sub-agg because the field is wildcard-typed and top_metrics cannot
  // collect it. Falls back to locationId when unavailable.
  locationLabel?: string;
  // The latest error reason for the most recent final summary on this
  // (monitor, location). Only populated for down checks where the heartbeat
  // doc has an `error` object — `error.message` is `text` so we collect it
  // via `top_hits` rather than `top_metrics`.
  error?: { message?: string; type?: string };
  // Start of the current state segment (down streak) for this location, taken
  // from `state.started_at` on the latest final summary. Used to render
  // "Down · 12m" without having to compute durations on the client.
  downSince?: string;
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

    return this.buildOverviewStatusResult(allConfigs, statusResult);
  }

  /**
   * Same output as {@link getOverviewStatus}, but reuses monitor saved objects already loaded
   * (e.g. diagnostics bundle) to avoid a second full `getAll` over synthetics monitors.
   */
  async getOverviewStatusWithPrefetchedMonitors(
    allConfigs: Array<
      SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes & { [ConfigKey.URLS]?: string }>
    >
  ) {
    this.filterData = await getMonitorFilters(this.routeContext);
    const statusResult = await this.getQueryResult();
    return this.buildOverviewStatusResult(allConfigs, statusResult);
  }

  private buildOverviewStatusResult(
    allConfigs: Array<
      SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes & { [ConfigKey.URLS]?: string }>
    >,
    statusResult: Map<string, LocationStatus>
  ) {
    const params = this.routeContext.request.query || {};
    const { page, perPage } = params;
    const isPaginated = page != null && perPage != null;

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

    if (!isPaginated) {
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

    const {
      configs,
      total,
      pageUpConfigs,
      pageDownConfigs,
      pagePendingConfigs,
      pageDisabledConfigs,
    } = this.paginateConfigs({ upConfigs, downConfigs, pendingConfigs, disabledConfigs });

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
      upConfigs: pageUpConfigs,
      downConfigs: pageDownConfigs,
      pendingConfigs: pagePendingConfigs,
      disabledConfigs: pageDisabledConfigs,
      configs,
      total,
      page,
      perPage,
    };
  }

  paginateConfigs({
    upConfigs,
    downConfigs,
    pendingConfigs,
    disabledConfigs,
  }: {
    upConfigs: Record<string, OverviewStatusMetaData>;
    downConfigs: Record<string, OverviewStatusMetaData>;
    pendingConfigs: Record<string, OverviewStatusMetaData>;
    disabledConfigs: Record<string, OverviewStatusMetaData>;
  }) {
    const params = this.routeContext.request.query || {};
    const {
      page = 1,
      perPage = 20,
      sortField = 'status',
      sortOrder = 'asc',
      statusFilter,
    } = params;

    let allConfigs: OverviewStatusMetaData[];

    if (statusFilter) {
      switch (statusFilter) {
        case 'down':
          allConfigs = Object.values(downConfigs);
          break;
        case 'up':
          allConfigs = Object.values(upConfigs);
          break;
        case 'disabled':
          allConfigs = Object.values(disabledConfigs);
          break;
        case 'pending':
          allConfigs = Object.values(pendingConfigs);
          break;
        default:
          allConfigs = [];
      }
    } else {
      const upAndDown =
        sortOrder === 'asc'
          ? [...Object.values(downConfigs), ...Object.values(upConfigs)]
          : [...Object.values(upConfigs), ...Object.values(downConfigs)];
      allConfigs = [
        ...upAndDown,
        ...Object.values(disabledConfigs),
        ...Object.values(pendingConfigs),
      ];
    }

    this.sortConfigs(allConfigs, sortField, sortOrder);

    const total = allConfigs.length;
    const start = (page - 1) * perPage;
    const pageConfigs = allConfigs.slice(start, start + perPage);

    const pageUpConfigs: Record<string, OverviewStatusMetaData> = {};
    const pageDownConfigs: Record<string, OverviewStatusMetaData> = {};
    const pagePendingConfigs: Record<string, OverviewStatusMetaData> = {};
    const pageDisabledConfigs: Record<string, OverviewStatusMetaData> = {};

    for (const config of pageConfigs) {
      const key = config.configId;
      switch (config.overallStatus) {
        case MONITOR_STATUS_ENUM.DOWN:
          pageDownConfigs[key] = config;
          break;
        case MONITOR_STATUS_ENUM.UP:
          pageUpConfigs[key] = config;
          break;
        case MONITOR_STATUS_ENUM.DISABLED:
          pageDisabledConfigs[key] = config;
          break;
        default:
          pagePendingConfigs[key] = config;
      }
    }

    return {
      configs: pageConfigs,
      total,
      pageUpConfigs,
      pageDownConfigs,
      pagePendingConfigs,
      pageDisabledConfigs,
    };
  }

  private sortConfigs(
    configs: OverviewStatusMetaData[],
    sortField: string | undefined,
    sortOrder: string | undefined
  ) {
    const dir = sortOrder === 'desc' ? -1 : 1;

    switch (sortField) {
      case 'name.keyword':
        configs.sort((a, b) => dir * a.name.localeCompare(b.name));
        break;
      case 'updated_at':
        configs.sort((a, b) => {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dir * (aTime - bTime);
        });
        break;
      case 'urls': {
        const withUrl = configs.filter((m) => m.urls);
        const withoutUrl = configs.filter((m) => !m.urls);
        withUrl.sort((a, b) => dir * (a.urls ?? '').localeCompare(b.urls ?? ''));
        configs.length = 0;
        configs.push(...withUrl, ...withoutUrl);
        break;
      }
      case 'type.keyword':
        configs.sort((a, b) => dir * (a.type ?? '').localeCompare(b.type ?? ''));
        break;
      case 'status':
      default:
        break;
    }
  }

  async getEsDataFilters() {
    const { spaceId, request } = this.routeContext;
    const params = request.query || {};
    const {
      query,
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
      ...(await this.getSpaceFilters(spaceId, Boolean(showFromAllSpaces))),
      ...getTermFilter('monitor.type', monitorTypes),
      ...getTermFilter('tags', tags),
      ...getTermFilter('monitor.project.id', projects),
    ];

    if (query) {
      filters.push({
        simple_query_string: {
          query,
          fields: ['monitor.name', 'tags', 'url.full', 'monitor.project.id'],
          default_operator: 'OR',
        },
      });
    }

    if (scopeStatusByLocation && !isEmpty(locationIds) && locationIds) {
      filters.push({
        terms: {
          'observer.name': locationIds,
        },
      });
    }
    return filters;
  }

  /**
   * Build the `meta.space_id` scoping for the status query.
   *
   * Local pings are already bounded by the saved-object query, which fetches
   * monitors with `namespaces: ['*']` intersected with the user's permitted
   * spaces; any local ping without a matching saved object is dropped during
   * reconciliation. So local pings never need a `meta.space_id` constraint here.
   *
   * Remote (CCS) pings have *no* local saved object to join against, so they are
   * the only pings that can leak across spaces. We therefore tie remote pings to
   * the active space's `meta.space_id` (plus `*`). The one exception is a user
   * who can read synthetics in *all* spaces — they are allowed to see remote
   * pings from every space, so the constraint is dropped entirely for them.
   */
  private async getSpaceFilters(
    spaceId: string,
    showFromAllSpaces: boolean
  ): Promise<QueryDslQueryContainer[]> {
    if (!spaceId || spaceId === ALL_SPACES_ID) {
      return [];
    }

    const activeSpaceTerms: QueryDslQueryContainer = {
      terms: { 'meta.space_id': [spaceId, ALL_SPACES_ID] },
    };

    // Single-space view: both local and remote pings are tied to the active space.
    if (!showFromAllSpaces) {
      return [activeSpaceTerms];
    }

    // "All permitted spaces" on a local-only cluster: there are no remote pings,
    // and local pings are bounded by the SO join, so nothing to add. Checked
    // before the privilege lookup below so non-CCS deployments short-circuit
    // without an authz round-trip.
    if (!isCCSEnabled(this.routeContext.server)) {
      return [];
    }

    // "All permitted spaces" + the user can read synthetics everywhere: no
    // scoping at all (local via the SO join, remote unbounded across clusters).
    if (await this.hasAllSpacesReadAccess()) {
      return [];
    }

    // "All permitted spaces" without all-spaces access: keep local pings
    // unconstrained (bounded by the SO join) while tying remote pings to the
    // active space so they cannot leak in from spaces the user isn't viewing.
    return [
      {
        bool: {
          minimum_should_match: 1,
          should: [
            // Local pings have no cluster-alias prefix in `_index` → any space.
            { bool: { must_not: [{ wildcard: { _index: '*:*' } }] } },
            // Remote pings carry a cluster-alias prefix → tied to the active space.
            { bool: { filter: [{ wildcard: { _index: '*:*' } }, activeSpaceTerms] } },
          ],
        },
      },
    ];
  }

  /**
   * Whether the current user can read synthetics in every space (current and
   * future). Mirrors the saved-object query's permitted-spaces semantics for the
   * remote-ping path, which has no saved-object join to rely on.
   */
  private async hasAllSpacesReadAccess(): Promise<boolean> {
    const { server, request } = this.routeContext;
    const { authz } = server.security;
    if (!authz.mode.useRbacForRequest(request)) {
      return true;
    }
    const { hasAllRequested } = await authz
      .checkPrivilegesWithRequest(request)
      .globally({ kibana: [authz.actions.api.get('uptime-read')] });
    return hasAllRequested;
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
        // which top_metrics cannot collect. We use a separate terms sub-agg instead.
        ...(ccsEnabled
          ? [
              { field: 'kibanaUrl' },
              { field: 'monitor.name' },
              { field: 'monitor.type' },
              { field: 'monitor.interval' },
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
                  ...(await this.getEsDataFilters()),
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
                  // observer.geo.name is a wildcard field which top_metrics
                  // cannot collect, so we use a terms sub-agg to resolve
                  // the human-readable location label for remote monitors.
                  ...(ccsEnabled
                    ? {
                        index_name: {
                          terms: {
                            field: '_index',
                            size: 1,
                          },
                        },
                        location_name: {
                          terms: {
                            field: 'observer.geo.name',
                            size: 1,
                          },
                        },
                      }
                    : {}),
                  // `error.message` is mapped as `text` so it can't be pulled
                  // via `top_metrics`; fetch the latest final summary doc and
                  // grab `error` + `state` from its source.
                  //
                  // We only need this for currently-down locations — for up
                  // locations the data is dropped at propagation time anyway.
                  // Wrapping the (expensive) `top_hits` in a `filter` agg
                  // keyed on `monitor.status: down` keeps `_source` loading
                  // off the hot up-bucket path, which dominates real
                  // deployments.
                  errorAndState: {
                    filter: {
                      term: { 'monitor.status': 'down' },
                    },
                    aggs: {
                      latest: {
                        top_hits: {
                          size: 1,
                          _source: {
                            includes: [
                              'error.message',
                              'error.type',
                              'state.started_at',
                              'state.duration_ms',
                            ],
                          },
                          sort: [{ '@timestamp': 'desc' as const }],
                        },
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

        data?.buckets.forEach((bucket) => {
          const { status: statusAgg, key: bKey, ...rest } = bucket;
          const monitorId = String(bKey.monitorId);
          const locationId = String(bKey.locationId);
          const metrics = statusAgg.top?.[0].metrics;
          const status = String(metrics?.['monitor.status']);
          const rawMonitorUrl = metrics?.['url.full.keyword'];

          const timestamp = String(statusAgg.top[0].sort[0]);

          // Pull error + state from the latest *down* doc in the bucket. The
          // `filter > top_hits` shape means up buckets short-circuit with
          // `doc_count: 0` and no `latest.hits.hits[0]`.
          const latestSource =
            (
              bucket as unknown as {
                errorAndState?: {
                  doc_count?: number;
                  latest?: {
                    hits?: {
                      hits?: Array<{
                        _source?: {
                          error?: { message?: unknown; type?: unknown };
                          state?: { started_at?: unknown };
                        };
                      }>;
                    };
                  };
                };
              }
            ).errorAndState?.latest?.hits?.hits?.[0]?._source ?? undefined;
          const errorMessage =
            latestSource?.error?.message != null ? String(latestSource.error.message) : undefined;
          const errorType =
            latestSource?.error?.type != null ? String(latestSource.error.type) : undefined;
          const downSince =
            latestSource?.state?.started_at != null
              ? String(latestSource.state.started_at)
              : undefined;

          if (!monitorByIds.has(String(monitorId))) {
            monitorByIds.set(monitorId, []);
          }

          // _index and observer.geo.name come from terms sub-aggs, not top_metrics
          const indexNameAgg = ccsEnabled ? (rest as any).index_name : undefined;
          const indexName = indexNameAgg?.buckets?.[0]?.key;
          const locationNameAgg = ccsEnabled ? (rest as any).location_name : undefined;
          const locationLabel = locationNameAgg?.buckets?.[0]?.key;
          const kibanaUrl = ccsEnabled ? metrics?.kibanaUrl : undefined;
          const monitorName = ccsEnabled ? metrics?.['monitor.name'] : undefined;
          const monitorType = ccsEnabled ? metrics?.['monitor.type'] : undefined;
          const monitorInterval = ccsEnabled ? metrics?.['monitor.interval'] : undefined;
          const configId = ccsEnabled ? metrics?.config_id : undefined;
          const tags = ccsEnabled ? metrics?.tags : undefined;

          monitorByIds.get(monitorId)?.push({
            status,
            locationId,
            timestamp,
            monitorUrl: rawMonitorUrl != null ? String(rawMonitorUrl) : undefined,
            ...(indexName ? { index: String(indexName) } : {}),
            ...(locationLabel ? { locationLabel: String(locationLabel) } : {}),
            ...(kibanaUrl ? { kibanaUrl: String(kibanaUrl) } : {}),
            ...(monitorName ? { monitorName: String(monitorName) } : {}),
            ...(monitorType ? { monitorType: String(monitorType) } : {}),
            ...(monitorInterval != null ? { monitorIntervalSeconds: Number(monitorInterval) } : {}),
            ...(configId ? { configId: String(configId) } : {}),
            ...(tags ? { tags: Array.isArray(tags) ? tags.map(String) : [String(tags)] } : {}),
            error:
              errorMessage || errorType ? { message: errorMessage, type: errorType } : undefined,
            downSince,
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
        const status = locData?.status || MONITOR_STATUS_ENUM.PENDING;
        // Only attach `error` / `downSince` when this location is currently
        // down — otherwise we'd carry stale error text from the previous
        // failure which is misleading on the overview row.
        const isDown = status === MONITOR_STATUS_ENUM.DOWN;
        const location = {
          status,
          id: monLocation.id,
          label: monLocation.label,
          ...(isDown && locData?.error ? { error: locData.error } : {}),
          ...(isDown && locData?.downSince ? { downSince: locData.downSince } : {}),
        };
        const meta = {
          ...metaInfo,
          monitorQueryId: monitorId,
          timestamp: locData?.timestamp,
          urls: monitor.attributes[ConfigKey.URLS] || locData?.monitorUrl,
          ...(remote ? { remote } : {}),
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
    // Reconcile bucket placement: processing order from ES is not
    // deterministic, so a monitor may land in upConfigs or pendingConfigs
    // even though a later location flipped overallStatus to DOWN. Walk
    // every non-down bucket and relocate entries whose overallStatus
    // disagrees with the bucket they currently sit in.
    for (const [id, meta] of Object.entries(upConfigs)) {
      if (meta.locations.some((loc) => loc.status === MONITOR_STATUS_ENUM.DOWN)) {
        meta.overallStatus = MONITOR_STATUS_ENUM.DOWN;
        meta.locations = movePendingToEnd(meta.locations);
        downConfigs[id] = meta;
        delete upConfigs[id];
      }
    }
    for (const [id, meta] of Object.entries(pendingConfigs)) {
      if (meta.locations.some((loc) => loc.status === MONITOR_STATUS_ENUM.DOWN)) {
        meta.overallStatus = MONITOR_STATUS_ENUM.DOWN;
        meta.locations = movePendingToEnd(meta.locations);
        downConfigs[id] = meta;
        delete pendingConfigs[id];
      } else if (meta.locations.some((loc) => loc.status === MONITOR_STATUS_ENUM.UP)) {
        meta.overallStatus = MONITOR_STATUS_ENUM.UP;
        meta.locations = movePendingToEnd(meta.locations);
        upConfigs[id] = meta;
        delete pendingConfigs[id];
      }
    }

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
          const status = locData.status;
          // Mirror local-monitor handling: only attach `error` / `downSince`
          // for currently-down locations to avoid surfacing stale failure
          // text from a previous run.
          const isDown = status === MONITOR_STATUS_ENUM.DOWN;
          const location = {
            id: locData.locationId,
            label: locData.locationLabel || locData.locationId,
            status,
            ...(isDown && locData.error ? { error: locData.error } : {}),
            ...(isDown && locData.downSince ? { downSince: locData.downSince } : {}),
          };
          const meta: OverviewStatusMetaData = {
            monitorQueryId: monitorId,
            configId,
            name: locData.monitorName || monitorId,
            type: locData.monitorType || 'unknown',
            schedule: locData.monitorIntervalSeconds
              ? String(Math.round(locData.monitorIntervalSeconds / 60))
              : '',
            tags: locData.tags ?? [],
            isEnabled: true,
            isStatusAlertEnabled: false,
            timestamp: locData.timestamp,
            urls: locData.monitorUrl,
            remote,
            locations: [location],
            overallStatus: status,
          };

          // Include the remote cluster name in the bucket key so that two
          // remote clusters that host the same monitor configId in the same
          // locationId (e.g. an imported project monitor synced to both)
          // don't collide and silently overwrite each other
          const monLocId = `${remote.remoteName}-${configId}-${locData.locationId}`;
          if (status === MONITOR_STATUS_ENUM.DOWN) {
            down += 1;
            downConfigs[monLocId] = meta;
          } else if (status === MONITOR_STATUS_ENUM.UP) {
            up += 1;
            upConfigs[monLocId] = meta;
          } else {
            pendingConfigs[monLocId] = { ...meta, overallStatus: MONITOR_STATUS_ENUM.PENDING };
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
