/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type {
  AnalyticsClusterState,
  AnalyticsClusterStateResult,
  AnalyticsEventSource,
  AnalyticsGeneratedPanel,
  AnalyticsLinks,
  AnalyticsSourceGeneration,
} from '../../types';

export const createLinksMock = (overrides: Partial<AnalyticsLinks> = {}): AnalyticsLinks => ({
  canUseIntegrations: true,
  canUseDiscover: true,
  canCreateDashboard: true,
  canOpenAgentChat: true,
  canOpenIndices: true,
  isSourceAvailable: jest.fn(() => true),
  openSource: jest.fn(),
  browseIntegrations: jest.fn(),
  openDiscover: jest.fn(),
  openDashboards: jest.fn(),
  createDashboard: jest.fn(),
  createSourceDashboard: jest.fn(),
  openDashboard: jest.fn(),
  askAgent: jest.fn(),
  openSearchRequest: jest.fn(),
  openConnectionDetails: jest.fn(),
  openIndexDetails: jest.fn(),
  openHome: jest.fn(),
  openOnboarding: jest.fn(),
  ...overrides,
});

export const EVENT_SOURCE: AnalyticsEventSource = {
  name: 'clickstream-events',
  kind: 'dataStream',
  dataKind: 'events',
  documentsCount: 1_250_000,
  timeField: '@timestamp',
  isSampleData: false,
};

export const SAMPLE_EVENT_SOURCE: AnalyticsEventSource = {
  name: 'kibana_sample_data_logs',
  kind: 'index',
  dataKind: 'events',
  documentsCount: 14_074,
  timeField: 'timestamp',
  isSampleData: true,
};

export const SEARCH_SOURCE: AnalyticsEventSource = {
  name: 'product-catalog',
  kind: 'index',
  dataKind: 'search',
  documentsCount: 48_000,
  timeField: null,
  isSampleData: false,
};

export const NO_DATA_STATE: AnalyticsClusterState = {
  stage: 'noData',
  journey: null,
  sources: [],
  totalSources: 0,
  documentsCount: 0,
  dashboardsCount: 0,
  recentDashboards: [],
};

export const HAS_DATA_STATE: AnalyticsClusterState = {
  stage: 'hasData',
  journey: 'analytics',
  sources: [EVENT_SOURCE, SAMPLE_EVENT_SOURCE],
  totalSources: 2,
  documentsCount: 1_264_074,
  dashboardsCount: 0,
  recentDashboards: [],
};

export const HAS_DASHBOARDS_STATE: AnalyticsClusterState = {
  ...HAS_DATA_STATE,
  stage: 'hasDashboards',
  dashboardsCount: 2,
  recentDashboards: [
    { id: 'checkout-funnel', title: 'Checkout funnel' },
    { id: 'daily-players', title: 'Daily active players' },
  ],
};

export const createClusterStateResult = (
  state: AnalyticsClusterState | undefined,
  overrides: Partial<AnalyticsClusterStateResult> = {}
): AnalyticsClusterStateResult => ({
  state,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
  ...overrides,
});

export const GENERATED_PANELS: readonly AnalyticsGeneratedPanel[] = [
  {
    title: 'Decline rate (%)',
    chart: 'metric',
    esql: 'FROM clickstream-events | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS decline_rate = COUNT(*)',
    y: ['decline_rate'],
    grid: { x: 0, y: 0, w: 48, h: 7 },
  },
  {
    title: 'Declines by reason',
    chart: 'bar_horizontal',
    esql: 'FROM clickstream-events | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS declines = COUNT(*) BY reason',
    x: 'reason',
    y: ['declines'],
    grid: { x: 0, y: 7, w: 24, h: 13 },
  },
  {
    title: 'Declines over time by method',
    chart: 'bar_stacked',
    esql: 'FROM clickstream-events | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS declines = COUNT(*) BY bucket = BUCKET(@timestamp, 30, ?_tstart, ?_tend), method',
    x: 'bucket',
    y: ['declines'],
    breakdown: 'method',
    grid: { x: 24, y: 7, w: 24, h: 13 },
  },
];

export const createGeneration = (
  overrides: Partial<AnalyticsSourceGeneration> = {}
): AnalyticsSourceGeneration => ({
  source: EVENT_SOURCE.name,
  summary: 'Card payments with declines in three currencies.',
  queries: [
    {
      id: 'generated_1',
      question: 'Which payment methods are declined most often?',
      esql: 'FROM clickstream-events\n| STATS declined = COUNT(*) WHERE status == "declined" BY method',
    },
    {
      id: 'generated_2',
      question: 'Do 3-D Secure payments fail less?',
      esql: 'FROM clickstream-events\n| STATS failed = COUNT(*) BY is_3ds',
    },
    {
      id: 'generated_3',
      question: 'Which decline reasons are most common?',
      esql: 'FROM clickstream-events\n| STATS declines = COUNT(*) BY reason',
    },
  ],
  panels: GENERATED_PANELS,
  model: 'test-model',
  schemaOnly: false,
  cached: false,
  generatedAt: 1,
  stats: {
    latencyMs: 9000,
    modelCalls: 1,
    inputTokens: 4000,
    outputTokens: 1500,
    queries: { proposed: 5, validFirstTime: 3, validAfterRepair: 0, dropped: 2 },
    panels: { proposed: 6, validFirstTime: 3, validAfterRepair: 0, dropped: 3 },
  },
  ...overrides,
});

export const createGenerationResult = (
  overrides: Partial<SourceGenerationResult> = {}
): SourceGenerationResult => ({
  status: 'pending',
  data: undefined,
  isRegenerating: false,
  hasRegenerateFailed: false,
  regenerate: jest.fn(),
  ...overrides,
});

export const SEARCH_STATE: AnalyticsClusterState = {
  stage: 'hasData',
  journey: 'search',
  sources: [SEARCH_SOURCE],
  totalSources: 1,
  documentsCount: 48_000,
  dashboardsCount: 0,
  recentDashboards: [],
};

/** Both kinds of data, the event source being the larger. */
export const MIXED_STATE: AnalyticsClusterState = {
  stage: 'hasData',
  journey: 'mixed',
  sources: [EVENT_SOURCE, SEARCH_SOURCE],
  totalSources: 2,
  documentsCount: 1_298_000,
  dashboardsCount: 0,
  recentDashboards: [],
};
