/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsClusterState,
  AnalyticsDataKind,
  AnalyticsEventSource,
  AnalyticsSourceAudience,
  ResolvedJourney,
} from './types';

export interface JourneyResolution {
  journey: ResolvedJourney;
  /** The other journey the data also supports; undefined when only one kind of data exists. */
  alternative: ResolvedJourney | undefined;
}

const JOURNEY_BY_DATA_KIND: Readonly<Record<AnalyticsDataKind, ResolvedJourney>> = {
  events: 'analytics',
  search: 'search',
};

const getOtherJourney = (journey: ResolvedJourney): ResolvedJourney =>
  journey === 'analytics' ? 'search' : 'analytics';

/**
 * Who the ingest gate addresses while the cluster holds no data to tell: users bringing in events
 * when analytics was asked for in this browser, else everyone.
 */
export const getGateAudience = (
  preferredJourney: ResolvedJourney | undefined
): AnalyticsSourceAudience => (preferredJourney === 'analytics' ? 'events' : 'all');

/** The sources the analytics views may list, pick and chart. */
export const getEventSources = (
  sources: readonly AnalyticsEventSource[]
): readonly AnalyticsEventSource[] => sources.filter(({ dataKind }) => dataKind === 'events');

export const getSearchSources = (
  sources: readonly AnalyticsEventSource[]
): readonly AnalyticsEventSource[] => sources.filter(({ dataKind }) => dataKind === 'search');

/** The user's largest own source of the list, else the largest sample. Expects the largest first. */
export const getLargestOwnSource = (
  sources: readonly AnalyticsEventSource[]
): AnalyticsEventSource | undefined =>
  sources.find(({ isSampleData }) => !isSampleData) ?? sources[0];

/**
 * Which journey to show for what the cluster holds; undefined while it holds no data. With both
 * kinds of data it is the one picked in this browser, else the journey of the largest own source.
 */
export const resolveJourney = (
  { journey, sources }: Pick<AnalyticsClusterState, 'journey' | 'sources'>,
  preferredJourney: ResolvedJourney | undefined
): JourneyResolution | undefined => {
  if (journey === null) {
    return undefined;
  }
  // The analytics views need a listed event source; the search home needs none. The server can
  // report event data that lies beyond the sources it lists.
  if (journey === 'search' || getEventSources(sources).length === 0) {
    return { journey: 'search', alternative: undefined };
  }
  if (journey === 'analytics') {
    return { journey, alternative: undefined };
  }
  const defaultSource = getLargestOwnSource(sources);
  const defaultJourney =
    defaultSource === undefined ? 'search' : JOURNEY_BY_DATA_KIND[defaultSource.dataKind];
  const resolved = preferredJourney ?? defaultJourney;

  return { journey: resolved, alternative: getOtherJourney(resolved) };
};

const sumDocuments = (sources: readonly AnalyticsEventSource[]): number | null => {
  let total = 0;
  for (const { documentsCount } of sources) {
    if (documentsCount === null) {
      return null;
    }
    total += documentsCount;
  }
  return total;
};

/**
 * The cluster state as the analytics views should see it: event sources only, with the counts
 * reduced by the search sources the server listed.
 */
export const toEventsState = (state: AnalyticsClusterState): AnalyticsClusterState => {
  const searchSources = getSearchSources(state.sources);
  if (searchSources.length === 0) {
    return state;
  }
  const sources = getEventSources(state.sources);
  const isEverySourceListed = state.totalSources <= state.sources.length;
  const searchDocuments = sumDocuments(searchSources);

  let documentsCount: number | null = null;
  if (isEverySourceListed) {
    documentsCount = sumDocuments(sources);
  } else if (state.documentsCount !== null && searchDocuments !== null) {
    documentsCount = Math.max(state.documentsCount - searchDocuments, 0);
  }

  return {
    ...state,
    sources,
    totalSources: Math.max(state.totalSources - searchSources.length, sources.length),
    documentsCount,
  };
};
