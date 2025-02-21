/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

import type { Logger } from '@kbn/logging';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';

import type { QUERY_RULE_TYPE_ID, SAVED_QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';

import type {
  RuleExecutorOptions,
  RuleType,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { WithoutReservedActionGroups } from '@kbn/alerting-plugin/common';
import type { ListClient } from '@kbn/lists-plugin/server';
import type {
  PersistenceServices,
  IRuleDataClient,
  SuppressedAlertService,
} from '@kbn/rule-registry-plugin/server';
import type { EcsFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import type { TypeOfFieldMap } from '@kbn/rule-registry-plugin/common/field_map';
import type { Filter } from '@kbn/es-query';

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { RulePreviewLoggedRequest } from '../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import type { RuleResponseAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import type { ConfigType } from '../../../config';
import type { SetupPlugins } from '../../../plugin';
import type { CompleteRule, RuleParams } from '../rule_schema';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { ITelemetryEventsSender } from '../../telemetry/sender';
import type { IRuleExecutionLogForExecutors, IRuleMonitoringService } from '../rule_monitoring';
import type { RefreshTypes } from '../types';

import type { Status } from '../../../../common/api/detection_engine';
import type { BaseHit, SearchTypes, EqlSequence } from '../../../../common/detection_engine/types';
import type { GenericBulkCreateResponse } from './factories';
import type { BuildReasonMessage } from './utils/reason_formatters';
import type {
  BaseFieldsLatest,
  DetectionAlert,
  EqlBuildingBlockFieldsLatest,
  EqlShellFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../common/api/detection_engine/model/alerts';
import type {
  RuleAction,
  RuleResponse,
} from '../../../../common/api/detection_engine/model/rule_schema';
import type { EnrichEvents } from './utils/enrichments/types';
import type { ThresholdResult } from './threshold/types';

export interface SecurityAlertTypeReturnValue<TState extends RuleTypeState> {
  bulkCreateTimes: string[];
  enrichmentTimes: string[];
  createdSignalsCount: number;
  createdSignals: unknown[];
  errors: string[];
  userError?: boolean;
  lastLookbackDate?: Date | null;
  searchAfterTimes: string[];
  state: TState;
  success: boolean;
  warning: boolean;
  warningMessages: string[];
  suppressedAlertsCount?: number;
  loggedRequests?: RulePreviewLoggedRequest[];
}

export interface RunOpts<TParams extends RuleParams> {
  completeRule: CompleteRule<TParams>;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  listClient: ListClient;
  searchAfterSize: number;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
  ruleDataClient: IRuleDataClient;
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  aggregatableTimestampField: string;
  unprocessedExceptions: ExceptionListItemSchema[];
  exceptionFilter: Filter | undefined;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  refreshOnIndexingAlerts: RefreshTypes;
  publicBaseUrl: string | undefined;
  experimentalFeatures?: ExperimentalFeatures;
  intendedTimestamp: Date | undefined;
}

export type SecurityAlertType<
  TParams extends RuleParams,
  TState extends RuleTypeState,
  TInstanceContext extends AlertInstanceContext = {},
  TActionGroupIds extends string = never
> = Omit<
  RuleType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, TActionGroupIds>,
  'executor'
> & {
  executor: (
    options: RuleExecutorOptions<
      TParams,
      TState,
      AlertInstanceState,
      TInstanceContext,
      WithoutReservedActionGroups<TActionGroupIds, never>
    > & {
      services: PersistenceServices;
      runOpts: RunOpts<TParams>;
    }
  ) => Promise<
    SearchAfterAndBulkCreateReturnType & {
      state: TState;
      loggedRequests?: RulePreviewLoggedRequest[];
    }
  >;
};

export interface CreateSecurityRuleTypeWrapperProps {
  lists: SetupPlugins['lists'];
  actions: SetupPlugins['actions'];
  logger: Logger;
  config: ConfigType;
  publicBaseUrl: string | undefined;
  ruleDataClient: IRuleDataClient;
  ruleExecutionLoggerFactory: IRuleMonitoringService['createRuleExecutionLogClientForExecutors'];
  version: string;
  isPreview?: boolean;
  experimentalFeatures?: ExperimentalFeatures;
  alerting: SetupPlugins['alerting'];
  analytics?: AnalyticsServiceSetup;
}

export type CreateSecurityRuleTypeWrapper = (
  options: CreateSecurityRuleTypeWrapperProps
) => <TParams extends RuleParams, TState extends RuleTypeState>(
  type: SecurityAlertType<TParams, TState, AlertInstanceContext, 'default'>
) => RuleType<TParams, TParams, TState, AlertInstanceState, AlertInstanceContext, 'default'>;

export interface CreateRuleOptions {
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
  ml?: SetupPlugins['ml'];
  eventsTelemetry?: ITelemetryEventsSender | undefined;
  version: string;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: (params: ScheduleNotificationActions) => void;
}

export interface ScheduleNotificationActions {
  signals: unknown[];
  signalsCount: number;
  responseActions: RuleResponseAction[] | undefined;
}

export interface CreateQueryRuleOptions extends CreateRuleOptions {
  id: typeof QUERY_RULE_TYPE_ID | typeof SAVED_QUERY_RULE_TYPE_ID;
  name: 'Custom Query Rule' | 'Saved Query Rule';
}

export interface RuleRangeTuple {
  to: moment.Moment;
  from: moment.Moment;
  maxSignals: number;
}

/**
 * SignalSource is being used as both a type for documents that match detection engine queries as well as
 * for queries that could be on top of signals. In cases where it is matched against detection engine queries,
 * '@timestamp' might not be there since it is not required and we have timestamp override capabilities. Also
 * the signal addition object, "signal?: {" will not be there unless it's a conflicting field when we are running
 * queries on events.
 *
 * For cases where we are running queries against signals (signals on signals) "@timestamp" should always be there
 * and the "signal?: {" sub-object should always be there.
 */
export interface SignalSource {
  [key: string]: SearchTypes;

  '@timestamp'?: string;
  signal?: {
    /**
     * "parent" is deprecated: new signals should populate "parents" instead. Both are optional
     * until all signals with parent are gone and we can safely remove it.
     * @deprecated Use parents instead
     */
    parent?: Ancestor;
    parents?: Ancestor[];
    ancestors: Ancestor[];
    group?: {
      id: string;
      index?: number;
    };
    rule: {
      id: string;
      description?: string;
      false_positives?: string[];
      immutable?: boolean;
    };
    /** signal.depth was introduced in 7.10 and pre-7.10 signals do not have it. */
    depth?: number;
    original_time?: string;
    /** signal.reason was introduced in 7.15 and pre-7.15 signals do not have it. */
    reason?: string;
    status?: string;
    threshold_result?: ThresholdResult;
  };
  kibana?: SearchTypes;
}

export interface BulkItem {
  create?: {
    _index: string;
    _type?: string;
    _id: string;
    _version: number;
    result?: string;
    _shards?: {
      total: number;
      successful: number;
      failed: number;
    };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid?: string;
      shard: string;
      index: string;
    };
  };
}

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: BulkItem[];
}

export type EventHit = Exclude<TypeOfFieldMap<EcsFieldMap>, '@timestamp'> & {
  '@timestamp': string;
  [key: string]: SearchTypes;
};
export type WrappedEventHit = BaseHit<EventHit>;

export type SignalSearchResponse<
  TAggregations = Record<estypes.AggregateName, estypes.AggregationsAggregate>
> = estypes.SearchResponse<SignalSource, TAggregations>;
export type SignalSourceHit = estypes.SearchHit<SignalSource>;
export type AlertSourceHit = estypes.SearchHit<DetectionAlert>;
export type WrappedSignalHit = BaseHit<SignalHit>;
export type BaseSignalHit = estypes.SearchHit<SignalSource>;

export interface Ancestor {
  rule?: string;
  id: string;
  type: string;
  index: string;
  depth: number;
}

export interface Signal {
  _meta?: {
    version: number;
  };
  rule: RuleResponse;
  /**
   * @deprecated Use "parents" instead of "parent"
   */
  parent?: Ancestor;
  parents: Ancestor[];
  ancestors: Ancestor[];
  group?: {
    id: string;
    index?: number;
  };
  original_time?: string;
  original_event?: SearchTypes;
  reason?: string;
  status: Status;
  threshold_result?: ThresholdResult;
  original_signal?: SearchTypes;
  depth: number;
}

export interface SignalHit {
  '@timestamp': string;
  event: object;
  signal: Signal;

  [key: string]: SearchTypes;
}

export interface AlertAttributes<T extends RuleParams = RuleParams> {
  actions: RuleAction[];
  alertTypeId: string;
  enabled: boolean;
  name: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  schedule: {
    interval: string;
  };
  throttle: string;
  params: T;
}

export type BulkResponseErrorAggregation = Record<string, { count: number; statusCode: number }>;

export type SignalsEnrichment = (signals: SignalSourceHit[]) => Promise<SignalSourceHit[]>;

export type BulkCreate = <T extends BaseFieldsLatest>(
  docs: Array<WrappedFieldsLatest<T>>,
  maxAlerts?: number,
  enrichEvents?: EnrichEvents
) => Promise<GenericBulkCreateResponse<T>>;

export type SimpleHit = BaseHit<{ '@timestamp'?: string }>;

export type WrapHits = (
  hits: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => Array<WrappedFieldsLatest<BaseFieldsLatest>>;

export type WrapSuppressedHits = (
  hits: Array<estypes.SearchHit<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => Array<WrappedFieldsLatest<BaseFieldsLatest & SuppressionFieldsLatest>>;

export type WrapSequences = (
  sequences: Array<EqlSequence<SignalSource>>,
  buildReasonMessage: BuildReasonMessage
) => Array<
  WrappedFieldsLatest<EqlShellFieldsLatest> | WrappedFieldsLatest<EqlBuildingBlockFieldsLatest>
>;

export type RuleServices = RuleExecutorServices<
  AlertInstanceState,
  AlertInstanceContext,
  'default'
>;

export interface SearchAfterAndBulkCreateParams {
  tuple: {
    to: moment.Moment;
    from: moment.Moment;
    maxSignals: number;
  };
  services: RuleServices;
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  inputIndexPattern: string[];
  pageSize: number;
  filter: estypes.QueryDslQueryContainer;
  buildReasonMessage: BuildReasonMessage;
  enrichment?: SignalsEnrichment;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  trackTotalHits?: boolean;
  sortOrder?: estypes.SortOrder;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  additionalFilters?: estypes.QueryDslQueryContainer[];
  isLoggedRequestsEnabled?: boolean;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  warning: boolean;
  searchAfterTimes: string[];
  enrichmentTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
  createdSignals: unknown[];
  errors: string[];
  userError?: boolean;
  warningMessages: string[];
  suppressedAlertsCount?: number;
  loggedRequests?: RulePreviewLoggedRequest[];
}

export interface LoggedRequestsConfig {
  type: string;
  description: string;
  skipRequestQuery?: boolean;
}

// the new fields can be added later if needed
export interface OverrideBodyQuery {
  _source?: estypes.SearchSourceConfig;
  fields?: Array<estypes.QueryDslFieldAndFormat | estypes.Field>;
}
