/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANALYTICS_CLUSTER_STATE_PATH = '/internal/search_homepage/analytics/cluster_state';
export const ANALYTICS_EVENTS_OVER_TIME_PATH =
  '/internal/search_homepage/analytics/events_over_time';

/** How many event sources the cluster state lists, and the events-over-time chart can cover. */
export const MAX_ANALYTICS_EVENT_SOURCES = 5;

/**
 * Where the deployment is on the path from no events to live dashboards, derived from what the
 * cluster holds rather than from what the user clicked.
 */
export type AnalyticsStage = 'noData' | 'hasData' | 'hasDashboards';

/** Who an event is about, which decides what the page calls them. */
export type AnalyticsActorKind = 'user' | 'player' | 'customer' | 'account' | 'device';

export type AnalyticsMeasureKind = 'money' | 'duration' | 'generic';

export type AnalyticsDimensionKind =
  | 'status'
  | 'tenant'
  | 'merchant'
  | 'asset'
  | 'game'
  | 'ad'
  | 'site'
  | 'campaign'
  | 'product'
  | 'currency'
  | 'paymentMethod'
  | 'geo'
  | 'device'
  | 'segment';

/** A field that plays a part in event analytics. */
export interface AnalyticsSourceField {
  /** The field to query: the keyword sub-field when the field itself is text. */
  name: string;
  /** The field's own vocabulary as lower-case words, for example `merchant category`. */
  label: string;
}

export interface AnalyticsActorField extends AnalyticsSourceField {
  kind: AnalyticsActorKind;
}

export interface AnalyticsMeasureField extends AnalyticsSourceField {
  kind: AnalyticsMeasureKind;
}

export interface AnalyticsDimensionField extends AnalyticsSourceField {
  kind: AnalyticsDimensionKind;
}

/**
 * The parts an event source's fields play, read from field names and types alone. Lists hold the
 * likeliest candidate first.
 */
export interface AnalyticsSourceFields {
  /** The event name. */
  action?: AnalyticsSourceField;
  actors: readonly AnalyticsActorField[];
  session?: AnalyticsSourceField;
  /** Numeric fields worth adding up or averaging. */
  measures: readonly AnalyticsMeasureField[];
  /** Categorical fields worth breaking events down by. */
  dimensions: readonly AnalyticsDimensionField[];
  geoPoint?: string;
}

/**
 * What a source's documents are for: `events` are things that happened at a time and are counted
 * and charted, `search` is content that is looked up by relevance.
 */
export type AnalyticsDataKind = 'events' | 'search';

/** Which home the deployment's data calls for; `mixed` when it holds both kinds. */
export type AnalyticsJourney = 'analytics' | 'search' | 'mixed';

/** A data stream or index holding the user's data. */
export interface AnalyticsEventSource {
  name: string;
  kind: 'dataStream' | 'index';
  dataKind: AnalyticsDataKind;
  documentsCount: number | null;
  /** Date field to bucket events on; null when none could be detected. */
  timeField: string | null;
  isSampleData: boolean;
  /** Absent when no field could be given a part. */
  fields?: AnalyticsSourceFields;
}

export interface AnalyticsDashboardSummary {
  id: string;
  title: string;
}

export interface AnalyticsClusterState {
  stage: AnalyticsStage;
  /** Null exactly when the stage is `noData`. */
  journey: AnalyticsJourney | null;
  /** Largest event sources first, capped by the server. */
  sources: readonly AnalyticsEventSource[];
  /** Total number of event sources, which can exceed `sources.length`. */
  totalSources: number;
  documentsCount: number | null;
  /** Dashboards excluding those installed with Kibana sample data. */
  dashboardsCount: number;
  /** Most recently updated dashboards, capped by the server. */
  recentDashboards: readonly AnalyticsDashboardSummary[];
}

/** An event source to chart, with the date field its events are bucketed on. */
export interface AnalyticsEventsOverTimeSource {
  name: string;
  timeField: string;
}

export interface AnalyticsEventsOverTimeRequest {
  sources: readonly AnalyticsEventsOverTimeSource[];
}

export interface AnalyticsEventsBucket {
  /** Start of the bucket, in epoch milliseconds. */
  timestamp: number;
  count: number;
}

/** Event counts in equal buckets from the first event of the lookback period until now. */
export interface AnalyticsEventsOverTime {
  from: number;
  to: number;
  intervalMs: number;
  total: number;
  /** Empty when the sources hold no events in the lookback period. */
  buckets: readonly AnalyticsEventsBucket[];
}

export const ANALYTICS_GENERATION_PATH = '/internal/search_homepage/analytics/generation';
export const ANALYTICS_GENERATION_AVAILABILITY_PATH =
  '/internal/search_homepage/analytics/generation/availability';

export const ANALYTICS_USE_CASE_IDS = [
  'clickstream',
  'gaming',
  'transactions',
  'adtech',
  'iot',
  'customerFacing',
] as const;

export type AnalyticsUseCaseId = (typeof ANALYTICS_USE_CASE_IDS)[number];

export interface AnalyticsStarterQuery {
  id: string;
  /** The question the query answers, phrased the way a user would ask it. */
  question: string;
  esql: string;
}

/** Why questions and dashboards cannot be written by a model for this caller. */
export type AnalyticsGenerationUnavailableReason =
  /** Turned off in the Kibana configuration. */
  'disabled' | 'agentBuilderMissing' | 'license' | 'noModel';

export interface AnalyticsGenerationAvailability {
  available: boolean;
  reason?: AnalyticsGenerationUnavailableReason;
  /** Whether truncated document values are sent to the model, or field names and types only. */
  sampleValues: boolean;
}

export interface AnalyticsGenerationRequest {
  source: string;
  timeField?: string;
  useCaseId?: AnalyticsUseCaseId;
  /** Sends field names and types only, whatever the server allows. */
  schemaOnly?: boolean;
  /** Writes new questions instead of returning the ones kept for this source. */
  refresh?: boolean;
  /** Uses this connector or inference endpoint instead of the default model. */
  connectorId?: string;
}

export interface AnalyticsDashboardGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnalyticsGeneratedChart = 'metric' | 'bar' | 'bar_horizontal' | 'bar_stacked';

/** A chart a model proposed, checked against the source and placed on the dashboard grid. */
export interface AnalyticsGeneratedPanel {
  title: string;
  chart: AnalyticsGeneratedChart;
  /** Reads the dashboard time range through `?_tstart` and `?_tend` when the source has a time field. */
  esql: string;
  /** The category or time bucket column; absent for a metric. */
  x?: string;
  y: readonly string[];
  breakdown?: string;
  grid: AnalyticsDashboardGrid;
}

export interface AnalyticsGenerationCounts {
  proposed: number;
  validFirstTime: number;
  validAfterRepair: number;
  dropped: number;
}

export interface AnalyticsGenerationStats {
  latencyMs: number;
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  queries: AnalyticsGenerationCounts;
  panels: AnalyticsGenerationCounts;
}

/** Questions and a dashboard written by a model for one event source, every query run against it. */
export interface AnalyticsSourceGeneration {
  source: string;
  /** One sentence on what the events look like; null when the model gave none worth showing. */
  summary: string | null;
  /** Most insightful first; null when too few passed validation to replace the built-in ones. */
  queries: readonly AnalyticsStarterQuery[] | null;
  /** Null when too few panels passed validation to replace the built-in dashboard. */
  panels: readonly AnalyticsGeneratedPanel[] | null;
  model: string;
  /** Whether the model saw field names and types only. */
  schemaOnly: boolean;
  /** Whether this answer was kept from an earlier request by the same user. */
  cached: boolean;
  generatedAt: number;
  stats: AnalyticsGenerationStats;
}

export const MIN_GENERATED_QUERIES = 3;
export const MAX_GENERATED_QUERIES = 5;
export const MIN_GENERATED_PANELS = 3;
export const MAX_GENERATED_PANELS = 6;
