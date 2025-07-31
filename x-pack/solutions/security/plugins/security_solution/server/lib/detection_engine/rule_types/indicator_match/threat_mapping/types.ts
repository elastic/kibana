/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type {
  ThreatMapping,
  ThreatMappingEntries,
  ThreatIndex,
  ThreatLanguageOrUndefined,
  ThreatIndicatorPath,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type {
  OpenPointInTimeResponse,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Filter, DataViewFieldBase } from '@kbn/es-query';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import type {
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
  OverrideBodyQuery,
  SecuritySharedParams,
  SecurityRuleServices,
} from '../../types';
import type { ThreatRuleParams } from '../../../rule_schema';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import type { ScheduleNotificationResponseActionsService } from '../../../rule_response_actions/schedule_notification_response_actions';

export type SortOrderOrUndefined = 'asc' | 'desc' | undefined;

export interface CreateThreatSignalsOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  eventsTelemetry: ITelemetryEventsSender | undefined;
  services: SecurityRuleServices;
  wrapSuppressedHits: WrapSuppressedHits;
  licensing: LicensingPluginSetup;
  scheduleNotificationResponseActionsService: ScheduleNotificationResponseActionsService;
}

export interface CreateThreatSignalOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentThreatList: ThreatListItem[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  filters: unknown[];
  services: SecurityRuleServices;
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
}

export interface CreateEventSignalOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  currentResult: SearchAfterAndBulkCreateReturnType;
  currentEventList: EventItem[];
  eventsTelemetry: ITelemetryEventsSender | undefined;
  filters: unknown[];
  services: SecurityRuleServices;
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
}

type EntryKey = 'field' | 'value';

export interface BuildThreatMappingFilterOptions {
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
  threatList: ThreatListItem[];
  threatMapping: ThreatMapping;
  entryKey: EntryKey;
  allowedFieldsForTermsQuery?: AllowedFieldsForTermsQuery;
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
  services: SecurityRuleServices;
  threatFilters: unknown[];
  threatIndicatorPath: ThreatIndicatorPath;
  pitId: string;
  reassignThreatPitId: (newPitId: OpenPointInTimeResponse['id'] | undefined) => void;
  threatIndexFields: DataViewFieldBase[];
  allowedFieldsForTermsQuery: AllowedFieldsForTermsQuery;
}

export interface EventsOptions {
  sharedParams: SecuritySharedParams<ThreatRuleParams>;
  services: SecurityRuleServices;
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
}) => Promise<estypes.SearchResponse<EventDoc | ThreatListDoc, unknown>>;

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

export interface FieldAndValueToDocIdsMap {
  [field: string]: {
    [fieldValue: string]: string[];
  };
}

export interface GetAllowedFieldsForTermQuery {
  services: SecurityRuleServices;
  inputIndex: string[];
  threatIndex: ThreatIndex;
  threatMatchedFields: ThreatMatchedFields;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}

export interface GetFieldAndValueToDocIdsMap {
  eventList: EventItem[];
  threatMatchedFields: ThreatMatchedFields;
}
