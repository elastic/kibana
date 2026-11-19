/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type {
  AnalyticsClusterState,
  AnalyticsEventSource,
  AnalyticsGeneratedPanel,
  AnalyticsJourney,
  AnalyticsStarterQuery,
  AnalyticsUseCaseId,
} from '../../common/analytics';

export type {
  AnalyticsClusterState,
  AnalyticsDashboardSummary,
  AnalyticsDataKind,
  AnalyticsEventSource,
  AnalyticsGeneratedPanel,
  AnalyticsJourney,
  AnalyticsSourceGeneration,
  AnalyticsStage,
  AnalyticsStarterQuery,
  AnalyticsUseCaseId,
} from '../../common/analytics';

/** A journey the page can show; `mixed` is resolved to one of these. */
export type ResolvedJourney = Exclude<AnalyticsJourney, 'mixed'>;

/** Sample events: the generated clickstream, and the Kibana ecommerce sample data set. */
export type AnalyticsSampleDatasetId = 'clickstream' | 'ecommerce';

export interface AnalyticsUseCase {
  id: AnalyticsUseCaseId;
  title: string;
  description: string;
  iconType: IconType;
  /** When set, the starter queries run against this sample data set's index. */
  sampleDataset?: AnalyticsSampleDatasetId;
  /** Index pattern the starter queries read from. */
  indexPattern: string;
  starterQueries: readonly AnalyticsStarterQuery[];
}

export type AnalyticsSourceGroupId = 'search' | 'streaming' | 'sendEvents' | 'objectStorage';

/** Who a list of ways to add data is for: everyone, or users bringing in events. */
export type AnalyticsSourceAudience = 'all' | 'events';

export type AnalyticsSourceTarget =
  /** Integrations browse page filtered by a search term. */
  | { type: 'integrationSearch'; searchTerm: string }
  /** Integrations browse page filtered by a category path such as `observability/stream_processing`. */
  | { type: 'integrationCategory'; categoryPath: string }
  /** The create-custom-integration flow. */
  | { type: 'integrationCreate' }
  | { type: 'fileUpload' }
  | { type: 'console' }
  | { type: 'dataFederation' }
  | { type: 'externalUrl'; url: string }
  /** The index list, where an empty index can be created. */
  | { type: 'createIndex' }
  /** The search basics API tutorial, opened in the embedded Console. */
  | { type: 'apiTutorial' }
  | { type: 'sampleDataDirectory' };

export interface AnalyticsSource {
  id: string;
  group: AnalyticsSourceGroupId;
  title: string;
  description: string;
  iconType: IconType;
  target: AnalyticsSourceTarget;
}

export interface AnalyticsSourceGroup {
  id: AnalyticsSourceGroupId;
  title: string;
  description: string;
}

/** A set of sources offered as one choice, which discloses the sources for its audience. */
export interface AnalyticsSourceList {
  id: string;
  title: string;
  description: string;
  iconType: IconType;
  audience: AnalyticsSourceAudience;
}

/** A way in shown ahead of the full list: one source to open, or a list of sources to choose from. */
export type AnalyticsFeaturedEntry =
  | { kind: 'source'; source: AnalyticsSource }
  | { kind: 'sourceList'; list: AnalyticsSourceList };

/** Per-browser preferences; progress itself is derived from `AnalyticsClusterState`. */
export interface AnalyticsPreferences {
  selectedUseCaseId: AnalyticsUseCaseId | undefined;
  selectUseCase: (id: AnalyticsUseCaseId) => void;
  /** The journey picked for a deployment that holds both events and search data. */
  preferredJourney: ResolvedJourney | undefined;
  setPreferredJourney: (journey: ResolvedJourney) => void;
}

export interface AnalyticsSourceDashboardOptions {
  /** The use case picked in this browser, which orders the built-in panels. */
  selectedUseCaseId?: AnalyticsUseCaseId;
  generatedPanels?: readonly AnalyticsGeneratedPanel[];
}

export interface AnalyticsLinks {
  canUseIntegrations: boolean;
  canUseDiscover: boolean;
  canCreateDashboard: boolean;
  canOpenAgentChat: boolean;
  /** Whether the index list and index details pages can be reached. */
  canOpenIndices: boolean;
  /** Whether the place a source links to exists in this deployment. */
  isSourceAvailable: (source: AnalyticsSource) => boolean;
  openSource: (source: AnalyticsSource) => void;
  browseIntegrations: () => void;
  /** Opens Discover in ES|QL mode; with no query, Discover's default ES|QL query is used. */
  openDiscover: (esql?: string) => void;
  openDashboards: () => void;
  createDashboard: () => void;
  /**
   * Opens an unsaved dashboard pre-populated with ES|QL panels over one of the user's event
   * sources: the generated panels when given, else panels built from the source's fields.
   */
  createSourceDashboard: (
    source: AnalyticsEventSource,
    options?: AnalyticsSourceDashboardOptions
  ) => void;
  openDashboard: (id: string) => void;
  askAgent: (message: string) => void;
  /** Opens Console with a search request against the source, or against every index without one. */
  openSearchRequest: (source: AnalyticsEventSource | undefined) => void;
  /** Opens the endpoint and API key details needed to connect an application. */
  openConnectionDetails: () => void;
  /** Opens the index in Index Management; a data stream opens the index list. */
  openIndexDetails: (source: AnalyticsEventSource | undefined) => void;
  openHome: () => void;
  openOnboarding: () => void;
}

export interface AnalyticsSampleData {
  isInstalling: boolean;
  /** Installs the data set if needed; resolves `false` when the install failed. */
  install: (dataset: AnalyticsSampleDatasetId) => Promise<boolean>;
}

export interface AnalyticsClusterStateResult {
  /** The last state the cluster reported; undefined until a request has succeeded. */
  state: AnalyticsClusterState | undefined;
  /** True only until the first request settles. */
  isLoading: boolean;
  /** Whether the latest request failed; `state` may still hold an earlier answer. */
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
}
