/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { cloneDeep } from 'lodash';

import type {
  Logger,
  LogMeta,
  CoreStart,
  IScopedClusterClient,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  AggregationsAggregate,
  IlmExplainLifecycleRequest,
  OpenPointInTimeResponse,
  SearchRequest,
  SearchResponse,
  SearchRequest as ESSearchRequest,
  SortResults,
  IndicesGetDataStreamRequest,
  IndicesStatsRequest,
  IlmGetLifecycleRequest,
  IndicesGetRequest,
  NodesStatsRequest,
  Duration,
  IndicesGetIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  SIGNALS_ID,
  THRESHOLD_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type { TransportResult } from '@elastic/elasticsearch';
import type { AgentPolicy, Installation } from '@kbn/fleet-plugin/common';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import moment from 'moment';

import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { DEFAULT_DIAGNOSTIC_INDEX_PATTERN } from '../../../common/endpoint/constants';
import type { ExperimentalFeatures } from '../../../common';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import {
  exceptionListItemToTelemetryEntry,
  trustedApplicationToTelemetryEntry,
  ruleExceptionListItemToTelemetryEvent,
  setClusterInfo,
  newTelemetryLogger,
  withErrorMessage,
} from './helpers';
import { Fetcher } from '../../endpoint/routes/resolver/tree/utils/fetch';
import type { TreeOptions, TreeResponse } from '../../endpoint/routes/resolver/tree/utils/fetch';
import type { SafeEndpointEvent, ResolverSchema } from '../../../common/endpoint/types';
import type {
  TelemetryEvent,
  EnhancedAlertEvent,
  EndpointMetricDocument,
  ESLicense,
  ESClusterInfo,
  GetEndpointListResponse,
  RuleSearchResult,
  ExceptionListItem,
  ValueListResponse,
  ValueListResponseAggregation,
  ValueListItemsResponseAggregation,
  ValueListExceptionListResponseAggregation,
  ValueListIndicatorMatchResponseAggregation,
  Nullable,
  EndpointMetricsAggregation,
  EndpointMetricsAbstract,
  EndpointPolicyResponseDocument,
  EndpointPolicyResponseAggregation,
  EndpointMetadataAggregation,
  EndpointMetadataDocument,
  TelemetryQueryConfiguration,
} from './types';
import { telemetryConfiguration } from './configuration';
import { ENDPOINT_METRICS_INDEX } from '../../../common/constants';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../common/detection_engine/constants';
import type { TelemetryLogger } from './telemetry_logger';
import type {
  DataStream,
  IlmPhase,
  IlmPhases,
  IlmPolicy,
  IlmStats,
  Index,
  IndexSettings,
  IndexStats,
  IndexTemplateInfo,
} from './indices.metadata.types';
import { chunkStringsByMaxLength } from './collections_helpers';
import type {
  NodeIngestPipelinesStats,
  Pipeline,
  Processor,
  Totals,
} from './ingest_pipelines_stats.types';

export interface ITelemetryReceiver {
  start(
    core?: CoreStart,
    getIndexForType?: (type: string) => string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient,
    packageService?: PackageService,
    queryConfig?: TelemetryQueryConfiguration
  ): Promise<void>;

  getClusterInfo(): Nullable<ESClusterInfo>;

  fetchClusterInfo(): Promise<ESClusterInfo>;

  getLicenseInfo(): Nullable<ESLicense>;

  fetchLicenseInfo(): Promise<Nullable<ESLicense>>;

  closePointInTime(pitId: string): Promise<void>;

  fetchDetectionRulesPackageVersion(): Promise<Nullable<Installation>>;

  /**
   * As the policy id + policy version does not exist on the Endpoint Metrics document
   * we need to fetch information about the Fleet Agent and sync the metrics document
   * with the Agent's policy data.
   *
   * @returns Map of agent id to policy id
   */
  fetchFleetAgents(): Promise<Map<string, string>>;

  /**
   * Reads Endpoint Agent policy responses out of the `.ds-metrics-endpoint.policy*` data
   * stream and creates a local K/V structure that stores the policy response (V) with
   * the Endpoint Agent Id (K). A value will only exist if there has been a endpoint
   * enrolled in the last 24 hours OR a policy change has occurred. We only send
   * non-successful responses. If the field is null, we assume no responses in
   * the last 24h or no failures/warnings in the policy applied.
   *
   */
  fetchEndpointPolicyResponses(
    executeFrom: string,
    executeTo: string
  ): Promise<Map<string, EndpointPolicyResponseDocument>>;

  /**
   * Reads Endpoint Agent metrics out of the `.ds-metrics-endpoint.metrics` data stream
   * and buckets them by Endpoint Agent id and sorts by the top hit. The EP agent will
   * report its metrics once per day OR every time a policy change has occured. If
   * a metric document(s) exists for an EP agent we map to fleet agent and policy.
   */
  fetchEndpointMetricsAbstract(
    executeFrom: string,
    executeTo: string
  ): Promise<EndpointMetricsAbstract>;

  fetchEndpointMetricsById(ids: string[]): AsyncGenerator<EndpointMetricDocument[], void, unknown>;

  /**
   * Reads Endpoint Agent metadata out of the `.ds-metrics-endpoint.metadata` data stream
   * and buckets them by Endpoint Agent id and sorts by the top hit. The EP agent will
   * report its metadata once per day OR every time a policy change has occured.
   * If a metadata document(s) exists for an EP agent we map to fleet agent and policy.
   */
  fetchEndpointMetadata(
    executeFrom: string,
    executeTo: string
  ): Promise<Map<string, EndpointMetadataDocument>>;

  fetchDiagnosticAlertsBatch(
    executeFrom: string,
    executeTo: string
  ): AsyncGenerator<TelemetryEvent[], void, unknown>;

  /**
   * Using a PIT executes the given query and returns the results in pages.
   * The page size is calculated using the mean of a sample of N documents
   * executing the same query. The query must have a sort attribute.
   *
   * @param index The index to search
   * @param query The query to use
   * @returns An async generator of pages of results
   *
   * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html}
   * @see {ITelemetryReceiver#setMaxPageSizeBytes}
   * @see {ITelemetryReceiver#setNumDocsToSample}
   */
  paginate<T>(
    index: string,
    query: ESSearchRequest,
    queryConfig: TelemetryQueryConfiguration | undefined
  ): AsyncGenerator<T[], void, unknown>;

  fetchPolicyConfigs(id: string): Promise<AgentPolicy | null | undefined>;

  fetchTrustedApplications(): Promise<{
    data: ExceptionListItem[] | undefined;
    total: number;
    page: number;
    per_page: number;
  }>;

  fetchEndpointList(listId: string): Promise<GetEndpointListResponse>;

  fetchDetectionRules(): Promise<
    TransportResult<
      SearchResponse<RuleSearchResult, Record<string, AggregationsAggregate>>,
      unknown
    >
  >;

  fetchResponseActionsRules(
    executeFrom: string,
    executeTo: string
  ): Promise<
    TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
  >;

  fetchDetectionExceptionList(
    listId: string,
    ruleVersion: number
  ): Promise<{
    data: ExceptionListItem[];
    total: number;
    page: number;
    per_page: number;
  }>;

  fetchPrebuiltRuleAlertsBatch(
    index: string,
    executeFrom: string,
    executeTo: string
  ): AsyncGenerator<TelemetryEvent[], void, unknown>;

  fetchTimelineAlerts(
    index: string,
    rangeFrom: string,
    rangeTo: string,
    queryConfig: TelemetryQueryConfiguration
  ): AsyncGenerator<EnhancedAlertEvent[], void, unknown>;

  buildProcessTree(
    entityId: string,
    resolverSchema: ResolverSchema,
    startOfDay: string,
    endOfDay: string,
    agentId: string
  ): TreeResponse;

  fetchTimelineEvents(
    nodeIds: string[]
  ): Promise<SearchResponse<SafeEndpointEvent, Record<string, AggregationsAggregate>>>;

  fetchValueListMetaData(interval: number): Promise<ValueListResponse>;

  getAlertsIndex(): string | undefined;

  getExperimentalFeatures(): ExperimentalFeatures | undefined;

  setMaxPageSizeBytes(bytes: number): void;

  setNumDocsToSample(n: number): void;

  getIndices(): Promise<IndexSettings[]>;
  getDataStreams(): Promise<DataStream[]>;
  getIndicesStats(indices: string[], chunkSize: number): AsyncGenerator<IndexStats, void, unknown>;
  getIlmsStats(indices: string[], chunkSize: number): AsyncGenerator<IlmStats, void, unknown>;
  getIndexTemplatesStats(): Promise<IndexTemplateInfo[]>;
  getIlmsPolicies(ilms: string[], chunkSize: number): AsyncGenerator<IlmPolicy, void, unknown>;

  getIngestPipelinesStats(timeout: Duration): Promise<NodeIngestPipelinesStats[]>;
}

export class TelemetryReceiver implements ITelemetryReceiver {
  private readonly logger: TelemetryLogger;
  private agentClient?: AgentClient;
  private agentPolicyService?: AgentPolicyServiceInterface;
  private _esClient?: ElasticsearchClient;
  private exceptionListClient?: ExceptionListClient;
  private soClient?: SavedObjectsClientContract;
  private getIndexForType?: (type: string) => string;
  private alertsIndex?: string;
  private clusterInfo?: ESClusterInfo;
  private licenseInfo?: Nullable<ESLicense>;
  private processTreeFetcher?: Fetcher;
  private packageService?: PackageService;
  private experimentalFeatures: ExperimentalFeatures | undefined;
  private readonly maxRecords = 10_000 as const;
  private queryConfig?: TelemetryQueryConfiguration;

  // default to 2% of host's total memory or 80MiB, whichever is smaller
  private maxPageSizeBytes: number = Math.min(os.totalmem() * 0.02, 80 * 1024 * 1024);
  // number of docs to query to estimate the size of a single doc
  private numDocsToSample: number = 10;

  constructor(logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('telemetry_events.receiver'));
  }

  public async start(
    core?: CoreStart,
    getIndexForType?: (type: string) => string,
    alertsIndex?: string,
    endpointContextService?: EndpointAppContextService,
    exceptionListClient?: ExceptionListClient,
    packageService?: PackageService,
    queryConfig?: TelemetryQueryConfiguration
  ) {
    this.getIndexForType = getIndexForType;
    this.alertsIndex = alertsIndex;
    this.agentClient = endpointContextService?.getInternalFleetServices().agent;
    this.agentPolicyService = endpointContextService?.getInternalFleetServices().agentPolicy;
    this._esClient = core?.elasticsearch.client.asInternalUser;
    this.exceptionListClient = exceptionListClient;
    this.packageService = packageService;
    this.soClient =
      core?.savedObjects.createInternalRepository() as unknown as SavedObjectsClientContract;
    this.clusterInfo = await this.fetchClusterInfo();
    this.licenseInfo = await this.fetchLicenseInfo();
    this.experimentalFeatures = endpointContextService?.experimentalFeatures;
    const elasticsearch = core?.elasticsearch.client as unknown as IScopedClusterClient;
    this.processTreeFetcher = new Fetcher(elasticsearch);
    this.queryConfig = queryConfig;

    setClusterInfo(this.clusterInfo);
  }

  public getClusterInfo(): ESClusterInfo | undefined {
    return this.clusterInfo;
  }

  public getLicenseInfo(): Nullable<ESLicense> {
    return this.licenseInfo;
  }

  public getAlertsIndex(): string | undefined {
    return this.alertsIndex;
  }

  public getExperimentalFeatures(): ExperimentalFeatures | undefined {
    return this.experimentalFeatures;
  }

  public async fetchDetectionRulesPackageVersion(): Promise<Installation | undefined> {
    return this.packageService?.asInternalUser.getInstallation(PREBUILT_RULES_PACKAGE_NAME);
  }

  public async fetchFleetAgents() {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve fleet agents');
    }

    return (
      this.agentClient
        ?.listAgents({
          perPage: this.maxRecords,
          showInactive: true,
          kuery: 'status:*', // include unenrolled agents
          sortField: 'enrolled_at',
          sortOrder: 'desc',
        })
        .then((response) => {
          const agents = response?.agents ?? [];

          return agents.reduce((cache, agent) => {
            if (agent.policy_id !== null && agent.policy_id !== undefined) {
              cache.set(agent.id, agent.policy_id);
            }

            return cache;
          }, new Map<string, string>());
        }) ?? new Map()
    );
  }

  public async fetchEndpointPolicyResponses(executeFrom: string, executeTo: string) {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `.ds-metrics-endpoint.policy*`,
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      query: {
        range: {
          '@timestamp': {
            gte: executeFrom,
            lt: executeTo,
          },
        },
      },
      aggs: {
        policy_responses: {
          terms: {
            size: this.maxRecords,
            field: 'agent.id',
          },
          aggs: {
            latest_response: {
              top_hits: {
                size: 1,
                _source: {
                  includes: [
                    'agent',
                    'event',
                    'Endpoint.policy.applied.status',
                    'Endpoint.policy.applied.actions',
                    'Endpoint.policy.applied.artifacts.global',
                    'Endpoint.configuration',
                    'Endpoint.state',
                  ],
                },
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };

    return this.esClient()
      .search(query, { meta: true })
      .then((response) => response.body as unknown as EndpointPolicyResponseAggregation)
      .then((failedPolicyResponses) => {
        const buckets = failedPolicyResponses?.aggregations?.policy_responses?.buckets ?? [];

        // If there is no policy responses in the 24h > now then we will continue
        return buckets.reduce(
          (cache, endpointAgentId) =>
            cache.set(endpointAgentId.key, endpointAgentId.latest_response.hits.hits[0]._source),
          new Map<string, EndpointPolicyResponseDocument>()
        );
      });
  }

  public async fetchEndpointMetricsAbstract(executeFrom: string, executeTo: string) {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: ENDPOINT_METRICS_INDEX,
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      query: {
        range: {
          '@timestamp': {
            gte: executeFrom,
            lt: executeTo,
          },
        },
      },
      aggs: {
        endpoint_agents: {
          terms: {
            field: 'agent.id',
            size: this.maxRecords,
          },
          aggs: {
            latest_metrics: {
              top_hits: {
                size: 1,
                _source: false,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
              },
            },
          },
        },
        endpoint_count: {
          cardinality: {
            field: 'agent.id',
          },
        },
      },
    };

    return this.esClient()
      .search(query, { meta: true })
      .then((response) => response.body as unknown as EndpointMetricsAggregation)
      .then((endpointMetricsResponse) => {
        const buckets = endpointMetricsResponse?.aggregations?.endpoint_agents?.buckets ?? [];

        const endpointMetricIds = buckets.map(
          (epMetrics) => epMetrics.latest_metrics.hits.hits[0]._id
        );
        const totalEndpoints = buckets.length;

        return { endpointMetricIds, totalEndpoints };
      });
  }

  fetchEndpointMetricsById(ids: string[]): AsyncGenerator<EndpointMetricDocument[], void, unknown> {
    const query: ESSearchRequest = {
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      query: {
        ids: {
          values: ids,
        },
      },
      _source: {
        includes: ['@timestamp', 'agent', 'Endpoint.metrics', 'elastic.agent', 'host', 'event'],
      },
    };

    return this.paginate<EndpointMetricDocument>(ENDPOINT_METRICS_INDEX, query);
  }

  public async fetchEndpointMetadata(executeFrom: string, executeTo: string) {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: `.ds-metrics-endpoint.metadata-*`,
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      query: {
        range: {
          '@timestamp': {
            gte: executeFrom,
            lt: executeTo,
          },
        },
      },
      aggs: {
        endpoint_metadata: {
          terms: {
            field: 'agent.id',
            size: this.maxRecords,
          },
          aggs: {
            latest_metadata: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['@timestamp', 'agent', 'Endpoint.capabilities', 'elastic.agent'],
                },
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };

    return this.esClient()
      .search(query, { meta: true })
      .then((response) => response.body as unknown as EndpointMetadataAggregation)
      .then((endpointMetadataResponse) => {
        const buckets = endpointMetadataResponse?.aggregations?.endpoint_metadata?.buckets ?? [];

        return buckets.reduce((cache, endpointAgentId) => {
          const doc = endpointAgentId.latest_metadata.hits.hits[0]._source;
          cache.set(endpointAgentId.key, doc);
          return cache;
        }, new Map<string, EndpointMetadataDocument>());
      });
  }

  public async *fetchDiagnosticAlertsBatch(executeFrom: string, executeTo: string) {
    this.logger.debug('Searching diagnostic alerts', {
      from: executeFrom,
      to: executeTo,
    } as LogMeta);

    let pitId = await this.openPointInTime(DEFAULT_DIAGNOSTIC_INDEX_PATTERN);
    let fetchMore = true;
    let searchAfter: SortResults | undefined;

    const query: ESSearchRequest = {
      query: {
        range: {
          'event.ingested': {
            gte: executeFrom,
            lt: executeTo,
          },
        },
      },
      track_total_hits: false,
      sort: [
        {
          'event.ingested': {
            order: 'desc' as const,
          },
        },
      ],
      pit: { id: pitId },
      search_after: searchAfter,
      size: telemetryConfiguration.telemetry_max_buffer_size,
    };

    let response = null;
    while (fetchMore) {
      try {
        response = await this.esClient().search(query);
        const numOfHits = response?.hits.hits.length;

        if (numOfHits > 0) {
          const lastHit = response?.hits.hits[numOfHits - 1];
          query.search_after = lastHit?.sort;
        } else {
          fetchMore = false;
        }

        this.logger.debug('Diagnostic alerts to return', { numOfHits } as LogMeta);
        fetchMore = numOfHits > 0 && numOfHits < telemetryConfiguration.telemetry_max_buffer_size;
      } catch (error) {
        this.logger.warn('Error fetching alerts', withErrorMessage(error));
        fetchMore = false;
      }

      if (response == null) {
        await this.closePointInTime(pitId);
        return;
      }

      const alerts = response?.hits.hits.flatMap((h) =>
        h._source != null ? ([h._source] as TelemetryEvent[]) : []
      );

      if (response?.pit_id != null) {
        pitId = response?.pit_id;
      }

      yield alerts;
    }

    await this.closePointInTime(pitId);
  }

  public async fetchPolicyConfigs(id: string) {
    if (this.soClient === undefined || this.soClient === null) {
      throw Error(
        'saved object client is unavailable: cannot retrieve endpoint policy configurations'
      );
    }

    return this.agentPolicyService?.get(this.soClient, id);
  }

  public async fetchTrustedApplications() {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: cannot retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createTrustedAppsList();

    const timeFrom = moment.utc().subtract(1, 'day').valueOf();
    const results = await this.exceptionListClient.findExceptionListItem({
      listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      page: 1,
      perPage: 10_000,
      filter: `exception-list-agnostic.attributes.created_at >= ${timeFrom}`,
      namespaceType: 'agnostic',
      sortField: 'name',
      sortOrder: 'asc',
    });

    return {
      data: results?.data.map(trustedApplicationToTelemetryEntry),
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  public async fetchEndpointList(listId: string): Promise<GetEndpointListResponse> {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: could not retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createEndpointList();

    const timeFrom = moment.utc().subtract(1, 'day').valueOf();
    const results = await this.exceptionListClient.findExceptionListItem({
      listId,
      page: 1,
      perPage: this.maxRecords,
      filter: `exception-list-agnostic.attributes.created_at >= ${timeFrom}`,
      namespaceType: 'agnostic',
      sortField: 'name',
      sortOrder: 'asc',
    });

    return {
      data: results?.data.map(exceptionListItemToTelemetryEntry) ?? [],
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  /**
   * Gets the elastic rules which are the rules that have immutable set to true and are of a particular rule type
   * @returns The elastic rules
   */
  public async fetchDetectionRules() {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: this.getIndexForType?.('alert'),
      ignore_unavailable: true,
      size: this.maxRecords,
      query: {
        bool: {
          must: [
            {
              bool: {
                filter: {
                  terms: {
                    'alert.alertTypeId': [
                      SIGNALS_ID,
                      EQL_RULE_TYPE_ID,
                      ESQL_RULE_TYPE_ID,
                      ML_RULE_TYPE_ID,
                      QUERY_RULE_TYPE_ID,
                      SAVED_QUERY_RULE_TYPE_ID,
                      INDICATOR_RULE_TYPE_ID,
                      THRESHOLD_RULE_TYPE_ID,
                      NEW_TERMS_RULE_TYPE_ID,
                    ],
                  },
                },
              },
            },
            {
              bool: {
                filter: {
                  terms: {
                    'alert.params.immutable': [true],
                  },
                },
              },
            },
          ],
        },
      },
    };
    return this.esClient().search<RuleSearchResult>(query, { meta: true });
  }

  /**
   * Find elastic rules SOs which are the rules that have immutable set to true and are of a particular rule type
   * @returns custom elastic rules SOs with response actions enabled
   */
  public async fetchResponseActionsRules(executeFrom: string, executeTo: string) {
    const query: SearchRequest = {
      index: `${this.getIndexForType?.(RULE_SAVED_OBJECT_TYPE)}`,
      ignore_unavailable: true,
      size: 0, // no query results required - only aggregation quantity
      from: 0,
      query: {
        bool: {
          must: [
            {
              term: {
                type: 'alert',
              },
            },
            {
              term: {
                'alert.params.immutable': {
                  value: false,
                },
              },
            },
            {
              term: {
                'alert.enabled': {
                  value: true,
                },
              },
            },
            {
              terms: {
                'alert.consumer': ['siem', 'securitySolution'],
              },
            },
            {
              terms: {
                'alert.params.responseActions.actionTypeId': ['.endpoint', '.osquery'],
              },
            },
            {
              range: {
                'alert.updatedAt': {
                  gte: executeFrom,
                  lte: executeTo,
                },
              },
            },
          ],
        },
      },
      sort: [
        {
          'alert.updatedAt': {
            order: 'desc',
          },
        },
      ],
      aggs: {
        actionTypes: {
          terms: {
            field: 'alert.params.responseActions.actionTypeId',
          },
        },
      },
    };

    return this.esClient().search<unknown>(query, { meta: true });
  }

  public async fetchDetectionExceptionList(listId: string, ruleVersion: number) {
    if (this?.exceptionListClient === undefined || this?.exceptionListClient === null) {
      throw Error('exception list client is unavailable: could not retrieve trusted applications');
    }

    // Ensure list is created if it does not exist
    await this.exceptionListClient.createTrustedAppsList();

    const timeFrom = `exception-list.attributes.created_at >= ${moment
      .utc()
      .subtract(24, 'hours')
      .valueOf()}`;

    const results = await this.exceptionListClient?.findExceptionListsItem({
      listId: [listId],
      filter: [timeFrom],
      perPage: this.maxRecords,
      page: 1,
      sortField: 'exception-list.created_at',
      sortOrder: 'desc',
      namespaceType: ['single'],
    });

    return {
      data: results?.data.map((r) => ruleExceptionListItemToTelemetryEvent(r, ruleVersion)) ?? [],
      total: results?.total ?? 0,
      page: results?.page ?? 1,
      per_page: results?.per_page ?? this.maxRecords,
    };
  }

  public async *fetchPrebuiltRuleAlertsBatch(
    index: string,
    executeFrom: string,
    executeTo: string
  ) {
    this.logger.debug('Searching prebuilt rule alerts from', {
      executeFrom,
      executeTo,
    } as LogMeta);

    let pitId = await this.openPointInTime(index);
    let fetchMore = true;
    let searchAfter: SortResults | undefined;

    const query: ESSearchRequest = {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.rule.name': 'Malware Prevention Alert',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.rule.name': 'Malware Detection Alert',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.rule.name': 'Ransomware Prevention Alert',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.rule.name': 'Ransomware Detection Alert',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      'kibana.alert.rule.parameters.immutable': 'true',
                    },
                  },
                ],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: executeFrom,
                  lte: executeTo,
                },
              },
            },
          ],
        },
      },
      track_total_hits: false,
      sort: [
        { '@timestamp': { order: 'asc', format: 'strict_date_optional_time_nanos' } },
        { _shard_doc: 'desc' },
      ],
      pit: { id: pitId },
      search_after: searchAfter,
      size: 1_000,
    };

    let response = null;
    try {
      while (fetchMore) {
        response = await this.esClient().search(query);
        const numOfHits = response?.hits.hits.length;

        if (numOfHits > 0) {
          const lastHit = response?.hits.hits[numOfHits - 1];
          query.search_after = lastHit?.sort;
        } else {
          fetchMore = false;
        }

        fetchMore = numOfHits > 0 && numOfHits < 1_000;
        if (response == null) {
          await this.closePointInTime(pitId);
          return;
        }

        const alerts: TelemetryEvent[] = response.hits.hits.flatMap((h) =>
          h._source != null ? ([h._source] as TelemetryEvent[]) : []
        );

        if (response?.pit_id != null) {
          pitId = response?.pit_id;
        }

        this.logger.debug('Prebuilt rule alerts to return', { alerts: alerts.length } as LogMeta);

        yield alerts;
      }
    } catch (error) {
      // to keep backward compatibility with the previous implementation, silent return
      // once we start using `paginate` this error should be managed downstream
      this.logger.warn('Error fetching alerts', withErrorMessage(error));
      return;
    } finally {
      await this.closePointInTime(pitId);
    }
  }

  private async openPointInTime(indexPattern: string) {
    const keepAlive = '5m';
    const pitId: OpenPointInTimeResponse['id'] = (
      await this.esClient().openPointInTime({
        index: `${indexPattern}*`,
        keep_alive: keepAlive,
        expand_wildcards: ['open' as const, 'hidden' as const],
      })
    ).id;

    return pitId;
  }

  public async closePointInTime(pitId: string) {
    try {
      await this.esClient().closePointInTime({ id: pitId });
    } catch (error) {
      this.logger.warn(
        'Error trying to close point in time',
        withErrorMessage(error, {
          pit: pitId,
        } as LogMeta)
      );
    }
  }

  fetchTimelineAlerts(
    index: string,
    rangeFrom: string,
    rangeTo: string,
    queryConfig: TelemetryQueryConfiguration
  ): AsyncGenerator<EnhancedAlertEvent[], void, unknown> {
    const query: ESSearchRequest = {
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      'event.module': 'endpoint',
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      'kibana.alert.rule.parameters.immutable': 'true',
                    },
                  },
                ],
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: rangeFrom,
                  lte: rangeTo,
                },
              },
            },
          ],
        },
      },
      aggs: {
        endpoint_alert_count: {
          cardinality: {
            field: 'event.id',
          },
        },
      },
      track_total_hits: false,
      sort: [
        { '@timestamp': { order: 'asc', format: 'strict_date_optional_time_nanos' } },
        { _shard_doc: 'desc' },
      ] as unknown as string[],
      size: this.queryConfig?.pageSize ?? queryConfig.pageSize, // plugin config have precedence over CDN parameter
    };

    return this.paginate(index, query, queryConfig);
  }

  public async buildProcessTree(
    entityId: string,
    resolverSchema: ResolverSchema,
    startOfDay: string,
    endOfDay: string,
    agentId: string
  ): TreeResponse {
    if (this.processTreeFetcher === undefined || this.processTreeFetcher === null) {
      throw Error(
        'resolver tree builder is unavailable: cannot build encoded endpoint event graph'
      );
    }

    const request: TreeOptions = {
      ancestors: 200,
      descendants: 500,
      timeRange: {
        from: startOfDay,
        to: endOfDay,
      },
      schema: resolverSchema,
      nodes: [entityId],
      indexPatterns: [`${this.alertsIndex}*`, 'logs-*'],
      descendantLevels: 20,
      agentId,
    };

    return this.processTreeFetcher.tree(request, true);
  }

  async tierFilter() {
    const excludeColdAndFrozenTiers = !!(await this.queryConfig?.excludeColdAndFrozenTiers());
    if (excludeColdAndFrozenTiers) {
      return [
        {
          bool: {
            must_not: {
              terms: {
                _tier: ['data_frozen', 'data_cold'],
              },
            },
          },
        },
      ];
    }
    return [];
  }

  public async fetchTimelineEvents(nodeIds: string[]) {
    const tierFilter = await this.tierFilter();

    this.logger.debug('Fetching timeline events for node IDs', {
      tierFilters: tierFilter,
    } as LogMeta);

    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: [`${this.alertsIndex}*`, 'logs-*'],
      ignore_unavailable: true,
      size: 100,
      _source: {
        include: [
          '@timestamp',
          'process',
          'event',
          'file',
          'network',
          'dns',
          'kibana.rule.alert.uuid',
        ],
      },
      query: {
        bool: {
          filter: [
            {
              terms: {
                'process.entity_id': nodeIds,
              },
            },
            {
              term: {
                'event.category': 'process',
              },
            },
            ...tierFilter,
          ],
        },
      },
    };

    return this.esClient().search<SafeEndpointEvent>(query);
  }

  public async fetchValueListMetaData(_interval: number) {
    const listQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.lists-*',
      ignore_unavailable: true,
      size: 0, // no query results required - only aggregation quantity
      aggs: {
        total_value_list_count: {
          cardinality: {
            field: 'name',
          },
        },
        type_breakdown: {
          terms: {
            field: 'type',
            size: 50,
          },
        },
      },
    };
    const itemQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.items-*',
      ignore_unavailable: true,
      size: 0, // no query results required - only aggregation quantity
      aggs: {
        value_list_item_count: {
          terms: {
            field: 'list_id',
            size: 100,
          },
        },
      },
    };
    const exceptionListQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: this.getIndexForType?.('exception-list'),
      ignore_unavailable: true,
      size: 0, // no query results required - only aggregation quantity
      query: {
        bool: {
          must: [{ match: { 'exception-list.entries.type': 'list' } }],
        },
      },
      aggs: {
        vl_included_in_exception_lists_count: {
          cardinality: {
            field: 'exception-list.entries.list.id',
          },
        },
      },
    };
    const indicatorMatchRuleQuery: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: this.getIndexForType?.('alert'),
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          must: [{ prefix: { 'alert.params.threatIndex': '.items' } }],
        },
      },
      aggs: {
        vl_used_in_indicator_match_rule_count: {
          cardinality: {
            field: 'alert.params.ruleId',
          },
        },
      },
    };
    const [listMetrics, itemMetrics, exceptionListMetrics, indicatorMatchMetrics] =
      await Promise.all([
        this.esClient().search(listQuery),
        this.esClient().search(itemQuery),
        this.esClient().search(exceptionListQuery),
        this.esClient().search(indicatorMatchRuleQuery),
      ]);
    const listMetricsResponse = listMetrics as unknown as ValueListResponseAggregation;
    const itemMetricsResponse = itemMetrics as unknown as ValueListItemsResponseAggregation;
    const exceptionListMetricsResponse =
      exceptionListMetrics as unknown as ValueListExceptionListResponseAggregation;
    const indicatorMatchMetricsResponse =
      indicatorMatchMetrics as unknown as ValueListIndicatorMatchResponseAggregation;
    return {
      listMetricsResponse,
      itemMetricsResponse,
      exceptionListMetricsResponse,
      indicatorMatchMetricsResponse,
    };
  }

  public async fetchClusterInfo(): Promise<ESClusterInfo> {
    // @ts-expect-error version.build_date is of type estypes.DateTime
    return this.esClient().info();
  }

  public async fetchLicenseInfo(): Promise<Nullable<ESLicense>> {
    try {
      const ret = (await this.esClient().transport.request({
        method: 'GET',
        path: '/_license',
        querystring: {
          local: true,
        },
      })) as { license: ESLicense };

      return ret.license;
    } catch (error) {
      this.logger.warn('failed retrieving license', withErrorMessage(error));
      return undefined;
    }
  }

  // calculates the number of documents that can be returned per page
  // or "-1" if the query returns no documents
  private async docsPerPage(index: string, query: ESSearchRequest): Promise<number> {
    const sampleQuery: ESSearchRequest = {
      query: cloneDeep(query.query),
      size: this.numDocsToSample,
      index,
    };
    const sampleSizeBytes = await this.esClient()
      .search<undefined>(sampleQuery)
      .then((r) => r.hits.hits.reduce((sum, hit) => JSON.stringify(hit._source).length + sum, 0));
    const docSizeBytes = sampleSizeBytes / this.numDocsToSample;

    if (docSizeBytes === 0) {
      return -1;
    }

    return Math.max(Math.floor(this.maxPageSizeBytes / docSizeBytes), 1);
  }

  public async *paginate<T>(
    index: string,
    query: ESSearchRequest,
    queryConfig: TelemetryQueryConfiguration | undefined = undefined
  ) {
    if (query.sort == null) {
      throw Error('Not possible to paginate a query without a sort attribute');
    }

    let queryOptions = {};
    let pageSize = -1;
    // kibana.yml configurations take precedence over CDN parameters
    if (this.queryConfig?.pageSize !== undefined) {
      queryOptions = {
        maxResponseSize: this.queryConfig.maxResponseSize,
        maxCompressedResponseSize: this.queryConfig.maxCompressedResponseSize,
      };
      pageSize = this.queryConfig.pageSize;
    } else if (queryConfig?.pageSize !== undefined) {
      queryOptions = {
        maxResponseSize: queryConfig.maxResponseSize,
        maxCompressedResponseSize: queryConfig.maxCompressedResponseSize,
      };
      pageSize = queryConfig.pageSize;
    } else {
      pageSize = await this.docsPerPage(index, query);
    }

    if (pageSize === -1) {
      this.logger.warn('Page size is not defined, default to 100');
      pageSize = 100;
    }

    this.logger.debug('Running paginated query', {
      queryConfig,
      queryOptions,
      pageSize,
    } as LogMeta);

    const pit = {
      id: await this.openPointInTime(index),
    };
    const esQuery: ESSearchRequest = {
      ...cloneDeep(query),
      pit,
      // not allow more than 10K pages
      size: Math.min(pageSize, 10_000),
    };
    try {
      do {
        const response = await this.nextPage(esQuery, queryOptions);
        const hits = response?.hits.hits.length ?? 0;

        if (hits === 0) {
          return;
        }

        esQuery.search_after = response?.hits.hits[hits - 1]?.sort;

        const data = response?.hits.hits.flatMap((h) =>
          h._source != null ? ([h._source] as T[]) : []
        );

        yield data;
      } while (esQuery.search_after !== undefined);
    } catch (error) {
      this.logger.warn('Error running paginated query', withErrorMessage(error));
      throw error;
    } finally {
      await this.closePointInTime(pit.id);
    }
  }

  private async nextPage(
    esQuery: ESSearchRequest,
    queryOptions: {}
  ): Promise<SearchResponse<unknown, Record<string, AggregationsAggregate>>> {
    return this.esClient().search(esQuery, queryOptions);
  }

  public setMaxPageSizeBytes(bytes: number) {
    this.maxPageSizeBytes = bytes;
  }

  public setNumDocsToSample(n: number) {
    this.numDocsToSample = n;
  }

  private esClient(): ElasticsearchClient {
    if (this._esClient === undefined || this._esClient === null) {
      throw Error('elasticsearch client is unavailable');
    }
    return this._esClient;
  }

  public async getIndices(): Promise<IndexSettings[]> {
    const es = this.esClient();

    this.logger.debug('Fetching indices');

    const request: IndicesGetRequest = {
      index: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: [
        '*.mappings._source.mode',
        '*.settings.index.default_pipeline',
        '*.settings.index.final_pipeline',
        '*.settings.index.mode',
        '*.settings.index.provided_name',
      ],
    };

    return es.indices
      .get(request)
      .then((indices) =>
        Object.entries(indices).map(([index, value]) => {
          return {
            index_name: index,
            default_pipeline: value.settings?.index?.default_pipeline,
            final_pipeline: value.settings?.index?.final_pipeline,
            index_mode: value.settings?.index?.mode,
            source_mode: value.mappings?._source?.mode,
          } as IndexSettings;
        })
      )
      .catch((error) => {
        this.logger.warn('Error fetching indices', withErrorMessage(error));
        throw error;
      });
  }

  public async getDataStreams(): Promise<DataStream[]> {
    const es = this.esClient();

    this.logger.debug('Fetching datstreams');

    const request: IndicesGetDataStreamRequest = {
      name: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: [
        'data_streams.ilm_policy',
        'data_streams.indices.ilm_policy',
        'data_streams.indices.index_name',
        'data_streams.name',
        'data_streams.template',
      ],
    };

    return es.indices
      .getDataStream(request)
      .then((response) =>
        response.data_streams.map((ds) => {
          return {
            datastream_name: ds.name,
            ilm_policy: ds.ilm_policy,
            template: ds.template,
            indices:
              ds.indices?.map((index) => {
                return {
                  index_name: index.index_name,
                  ilm_policy: index.ilm_policy,
                } as Index;
              }) ?? [],
          } as DataStream;
        })
      )
      .catch((error) => {
        this.logger.warn('Error fetching datastreams', withErrorMessage(error));
        throw error;
      });
  }

  public async *getIndicesStats(indices: string[], chunkSize: number) {
    const es = this.esClient();
    const safeChunkSize = Math.min(chunkSize, 3000);

    this.logger.debug('Fetching indices stats');

    const groupedIndices = chunkStringsByMaxLength(indices, safeChunkSize);

    this.logger.debug('Splitted indices into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IndicesStatsRequest = {
        index: group,
        level: 'indices',
        metric: ['docs', 'search', 'store', 'indexing'],
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          'indices.*.total.search.query_total',
          'indices.*.total.search.query_time_in_millis',

          'indices.*.total.docs.count',
          'indices.*.total.docs.deleted',
          'indices.*.total.store.size_in_bytes',

          'indices.*.primaries.docs.count',
          'indices.*.primaries.docs.deleted',
          'indices.*.primaries.store.size_in_bytes',

          'indices.*.total.indexing.index_failed',
          'indices.*.total.indexing.index_failed_due_to_version_conflict',
        ],
      };

      try {
        const response = await es.indices.stats(request);
        for (const [indexName, stats] of Object.entries(response.indices ?? {})) {
          yield {
            index_name: indexName,

            query_total: stats.total?.search?.query_total,
            query_time_in_millis: stats.total?.search?.query_time_in_millis,

            docs_count: stats.total?.docs?.count,
            docs_deleted: stats.total?.docs?.deleted,
            docs_total_size_in_bytes: stats.total?.store?.size_in_bytes,

            index_failed: stats.total?.indexing?.index_failed,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            index_failed_due_to_version_conflict: (stats.total?.indexing as any)
              ?.index_failed_due_to_version_conflict,

            docs_count_primaries: stats.primaries?.docs?.count,
            docs_deleted_primaries: stats.primaries?.docs?.deleted,
            docs_total_size_in_bytes_primaries: stats.primaries?.store?.size_in_bytes,
          } as IndexStats;
        }
      } catch (error) {
        this.logger.warn('Error fetching indices stats', withErrorMessage(error));
        throw error;
      }
    }
  }

  public async *getIlmsStats(indices: string[], chunkSize: number) {
    const es = this.esClient();
    const safeChunkSize = Math.min(chunkSize, 3000);

    const groupedIndices = chunkStringsByMaxLength(indices, safeChunkSize);

    this.logger.debug('Splitted ilms into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IlmExplainLifecycleRequest = {
        index: group.join(','),
        only_managed: false,
        filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
      };

      const data = await es.ilm.explainLifecycle(request);

      try {
        for (const [indexName, stats] of Object.entries(data.indices ?? {})) {
          const entry = {
            index_name: indexName,
            phase: ('phase' in stats && stats.phase) || undefined,
            age: ('age' in stats && stats.age) || undefined,
            policy_name: ('policy' in stats && stats.policy) || undefined,
          } as IlmStats;

          yield entry;
        }
      } catch (error) {
        this.logger.warn('Error fetching ilm stats', withErrorMessage(error));
        throw error;
      }
    }
  }

  public async getIndexTemplatesStats(): Promise<IndexTemplateInfo[]> {
    const es = this.esClient();

    this.logger.debug('Fetching datstreams');

    const request: IndicesGetIndexTemplateRequest = {
      name: '*',
      filter_path: [
        'index_templates.name',
        'index_templates.index_template.template.settings.index.mode',
        'index_templates.index_template.data_stream',
        'index_templates.index_template._meta.package.name',
        'index_templates.index_template._meta.managed_by',
        'index_templates.index_template._meta.beat',
        'index_templates.index_template._meta.managed',
        'index_templates.index_template.composed_of',
        'index_templates.index_template.template.mappings._source.enabled',
        'index_templates.index_template.template.mappings._source.includes',
        'index_templates.index_template.template.mappings._source.excludes',
      ],
    };

    return es.indices
      .getIndexTemplate(request)
      .then((response) =>
        response.index_templates.map((props) => {
          const datastream = props.index_template?.data_stream !== undefined;
          return {
            template_name: props.name,
            index_mode: props.index_template.template?.settings?.index?.mode,
            package_name: props.index_template._meta?.package?.name,
            datastream,
            managed_by: props.index_template._meta?.managed_by,
            beat: props.index_template._meta?.beat,
            is_managed: props.index_template._meta?.managed,
            composed_of: props.index_template.composed_of,
            source_enabled: props.index_template.template?.mappings?._source?.enabled,
            source_includes: props.index_template.template?.mappings?._source?.includes ?? [],
            source_excludes: props.index_template.template?.mappings?._source?.excludes ?? [],
          } as IndexTemplateInfo;
        })
      )
      .catch((error) => {
        this.logger.warn('Error fetching index templates', withErrorMessage(error));
        throw error;
      });
  }

  public async *getIlmsPolicies(ilms: string[], chunkSize: number) {
    const es = this.esClient();
    const safeChunkSize = Math.min(chunkSize, 3000);

    const phase = (obj: unknown): Nullable<IlmPhase> => {
      let value: Nullable<IlmPhase>;
      if (obj !== null && obj !== undefined && typeof obj === 'object' && 'min_age' in obj) {
        value = {
          min_age: obj.min_age,
        } as IlmPhase;
      }
      return value;
    };

    const groupedIlms = chunkStringsByMaxLength(ilms, safeChunkSize);

    this.logger.debug('Splitted ilms into groups', {
      groups: groupedIlms.length,
      ilms: ilms.length,
    } as LogMeta);

    for (const group of groupedIlms) {
      this.logger.debug('Fetching ilm policies');
      const request: IlmGetLifecycleRequest = {
        name: group.join(','),
        filter_path: [
          '*.policy.phases.cold.min_age',
          '*.policy.phases.delete.min_age',
          '*.policy.phases.frozen.min_age',
          '*.policy.phases.hot.min_age',
          '*.policy.phases.warm.min_age',
          '*.modified_date',
        ],
      };

      const response = await es.ilm.getLifecycle(request);
      try {
        for (const [policyName, stats] of Object.entries(response ?? {})) {
          yield {
            policy_name: policyName,
            modified_date: stats.modified_date,
            phases: {
              cold: phase(stats.policy.phases.cold),
              delete: phase(stats.policy.phases.delete),
              frozen: phase(stats.policy.phases.frozen),
              hot: phase(stats.policy.phases.hot),
              warm: phase(stats.policy.phases.warm),
            } as IlmPhases,
          } as IlmPolicy;
        }
      } catch (error) {
        this.logger.warn('Error fetching ilm policies', withErrorMessage(error));
        throw error;
      }
    }
  }

  public async getIngestPipelinesStats(timeout: Duration): Promise<NodeIngestPipelinesStats[]> {
    const es = this.esClient();

    this.logger.debug('Fetching ingest pipelines stats');

    const request: NodesStatsRequest = {
      metric: 'ingest',
      filter_path: [
        'nodes.*.ingest.total',
        'nodes.*.ingest.pipelines.*.count',
        'nodes.*.ingest.pipelines.*.time_in_millis',
        'nodes.*.ingest.pipelines.*.failed',
        'nodes.*.ingest.pipelines.*.current',
        'nodes.*.ingest.pipelines.*.processors.*.stats.count',
        'nodes.*.ingest.pipelines.*.processors.*.stats.time_in_millis',
        'nodes.*.ingest.pipelines.*.processors.*.stats.failed',
        'nodes.*.ingest.pipelines.*.processors.*.stats.current',
      ],
      timeout,
    };

    return es.nodes
      .stats(request)
      .then((response) => {
        return Object.entries(response.nodes).map(([nodeName, node]) => {
          return {
            name: nodeName,
            totals: {
              count: node.ingest?.total?.count ?? 0,
              time_in_millis: node.ingest?.total?.time_in_millis ?? 0,
              current: node.ingest?.total?.current ?? 0,
              failed: node.ingest?.total?.failed ?? 0,
            } as Totals,
            pipelines: Object.entries(node.ingest?.pipelines ?? []).map(
              ([pipelineName, pipeline]) => {
                return {
                  name: pipelineName,
                  totals: {
                    count: pipeline.count,
                    time_in_millis: pipeline.time_in_millis,
                    current: pipeline.current,
                    failed: pipeline.failed,
                  } as Totals,
                  processors: (pipeline.processors ?? [])
                    .map((processors) => {
                      return Object.entries(processors).map(([processorName, processor]) => {
                        return {
                          name: processorName,
                          totals: {
                            count: processor.stats?.count ?? 0,
                            time_in_millis: processor.stats?.time_in_millis ?? 0,
                            current: processor.stats?.current ?? 0,
                            failed: processor.stats?.failed ?? 0,
                          } as Totals,
                        } as Processor;
                      });
                    })
                    .flat(),
                } as Pipeline;
              }
            ),
          } as NodeIngestPipelinesStats;
        });
      })
      .catch((error) => {
        this.logger.warn('Error fetching ingest pipelines stats', withErrorMessage(error));
        throw error;
      });
  }
}
