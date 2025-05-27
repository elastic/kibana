/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ThreatMapping,
  ThreatMappingEntries,
  ThreatIndex,
  ThreatLanguageOrUndefined,
  ThreatIndicatorPath,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Filter, DataViewFieldBase } from '@kbn/es-query';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import type {
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  OverrideBodyQuery,
  SecuritySharedParams,
  CreateRuleOptions,
} from '../../types';
import type { ThreatRuleParams } from '../../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import type { ExperimentalFeatures } from '../../../../../../common';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

export interface CreateThreatSignalsOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  experimentalFeatures: ExperimentalFeatures;
  scheduleNotificationResponseActionsService: CreateRuleOptions['scheduleNotificationResponseActionsService'];
}

export interface CreateThreatSignalOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentThreatList: ThreatListItem[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  filters: unknown[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  wrapSuppressedHits: WrapSuppressedHits;
  threatFilters: unknown[];
  perPage?: number;
  threatPitId: OpenPointInTimeResponse['id'];
  reassignThreatPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  allowedFieldsForTermsQuery: AllowedFieldsForTermsQuery;
  inputIndexFields: DataViewFieldBase[];
  threatIndexFields: DataViewFieldBase[];
  sortOrder?: SortOrderOrUndefined;
  isAlertSuppressionActive: boolean;
  experimentalFeatures: ExperimentalFeatures;
}

export interface CreateEventSignalOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentEventList: EventItem[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  filters: unknown[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  wrapSuppressedHits: WrapSuppressedHits;
  threatFilters: unknown[];
  perPage?: number;
  threatPitId: OpenPointInTimeResponse['id'];
  reassignThreatPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  allowedFieldsForTermsQuery: AllowedFieldsForTermsQuery;
  threatMatchedFields: ThreatMatchedFields;
  inputIndexFields: DataViewFieldBase[];
  threatIndexFields: DataViewFieldBase[];
  sortOrder?: SortOrderOrUndefined;
  isAlertSuppressionActive: boolean;
  experimentalFeatures: ExperimentalFeatures;
}

type EntryKey = 'field' | 'value';

export interface BuildThreatMappingFilterOptions {
  chunkSize?: number;
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
  allowedFieldsForTermsQuery?: AllowedFieldsForTermsQuery;
}

export interface FilterThreatMappingOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface CreateInnerAndClausesOptions {
  threatListItem: ThreatListItem;
  threatMappingEntries: ThreatMappingEntries;
  entryKey: EntryKey;
}

export interface CreateAndOrClausesOptions {
  threatListItem: ThreatListItem;
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
}

export interface BuildEntriesMappingFilterOptions {
  chunkSize: number;
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
  allowedFieldsForTermsQuery?: AllowedFieldsForTermsQuery;
}

export interface SplitShouldClausesOptions {
  chunkSize: number;
  should: BooleanFilter[];
}

export interface BooleanFilter {
  bool: QueryDslBoolQuery;
}

export interface TermQuery {
  terms: Record<string, string[] | string>;
}

interface ThreatListConfig {
  _source: string[] | boolean;
  fields: string[] | undefined;
}

export interface GetThreatListOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  esClient: ElasticsearchClient;
  perPage?: number;
  searchAfter: estypes.SortResults | undefined;
  threatFilters: unknown[];
  threatListConfig: ThreatListConfig;
  pitId: OpenPointInTimeResponse['id'];
  reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  indexFields: DataViewFieldBase[];
}

export interface ThreatListCountOptions {
  esClient: ElasticsearchClient;
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  threatFilters: unknown[];
  exceptionFilter: Filter | undefined;
  indexFields: DataViewFieldBase[];
}

export interface ThreatListDoc {
  [key: string]: unknown;
}

/**
 * This is an ECS document being returned, but the user could return or use non-ecs based
 * documents potentially.
 */
export type ThreatListItem = estypes.SearchHit<ThreatListDoc>;

export interface ThreatEnrichment {
  feed: Record<string, unknown>;
  indicator: Record<string, unknown>;
  matched: { id: string; index: string; field: string; atomic?: string; type: string };
}

interface BaseThreatNamedQuery {
  field: string;
  value: string;
  queryType: string;
}

export interface ThreatMatchNamedQuery extends BaseThreatNamedQuery {
  id: string;
  index: string;
}

export type ThreatTermNamedQuery = BaseThreatNamedQuery;

export type DecodedThreatNamedQuery = BaseThreatNamedQuery & { id?: string; index?: string };

export type GetMatchedThreats = (ids: string[]) => Promise<ThreatListItem[]>;

export interface BuildThreatEnrichmentOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  threatFilters: unknown[];
  threatIndicatorPath: ThreatIndicatorPath;
  pitId: string;
  reassignPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  threatIndexFields: DataViewFieldBase[];
}

export interface EventsOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  searchAfter: estypes.SortResults | undefined;
  perPage?: number;
  filters: unknown[];
  eventListConfig?: OverrideBodyQuery;
  indexFields: DataViewFieldBase[];
  sortOrder?: SortOrderOrUndefined;
}

export interface EventDoc {
  [key: string]: unknown;
}

export type EventItem = estypes.SearchHit<EventDoc>;

export interface EventCountOptions {
  esClient: ElasticsearchClient;
  index: string[];
  language: ThreatLanguageOrUndefined;
  query: string;
  filters: unknown[];
  tuple: RuleRangeTuple;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  exceptionFilter: Filter | undefined;
  indexFields: DataViewFieldBase[];
}

export interface SignalMatch {
  signalId: string;
  queries: ThreatMatchNamedQuery[];
}

export type GetDocumentListInterface = (params: {
  searchAfter: estypes.SortResults | undefined;
}) => Promise<estypes.SearchResponse<EventDoc | ThreatListDoc>>;

export type CreateSignalInterface = (
  params: EventItem[] | ThreatListItem[]
) => Promise<SearchAfterAndBulkCreateReturnType>;

export interface GetSortForThreatList {
  index: string[];
  listItemIndex: string;
}

export enum ThreatMatchQueryType {
  match = 'mq',
  term = 'tq',
}

export interface ThreatMatchedFields {
  source: string[];
  threat: string[];
}

export interface AllowedFieldsForTermsQuery {
  source: Record<string, boolean>;
  threat: Record<string, boolean>;
}

export interface SignalValuesMap {
  [field: string]: {
    [fieldValue: string]: string[];
  };
}

export interface GetAllowedFieldsForTermQuery {
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndex: string[];
  threatIndex: ThreatIndex;
  threatMatchedFields: ThreatMatchedFields;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}

export interface GetSignalValuesMap {
  eventList: EventItem[];
  threatMatchedFields: ThreatMatchedFields;
}
