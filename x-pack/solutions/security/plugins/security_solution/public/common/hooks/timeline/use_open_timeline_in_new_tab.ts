/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { encode } from '@kbn/rison';
import type { Filter } from '@kbn/es-query';
import { APP_UI_ID } from '../../../../common/constants';
import type { DataProvider } from '../../../../common/types';
import { prepareKQLParam } from '../../../../common/utils/kql';
import { buildGlobalQuery } from '../../lib/kuery';
import { useKibana } from '../../lib/kibana';
import { getTimelineUrl } from '../../components/link_to/redirect_to_timelines';
import type { TimeRange } from '../../store/inputs/model';

interface OpenAdHocTimelineParams {
  /**
   * The data providers to translate into a KQL query for the timeline.
   */
  dataProviders?: DataProvider[] | null;
  /**
   * The filters to translate into a KQL query for the timeline (used for range queries where
   * `useInsightDataProviders` returns filters instead of data providers).
   */
  filters?: Filter[] | null;
  /**
   * The time range to apply to the timeline.
   */
  timeRange?: TimeRange;
}

interface ExistsQuery {
  [key: string]: unknown;
  exists: { field: string };
}
interface MatchPhraseQuery {
  [key: string]: unknown;
  match_phrase: Record<string, string | number | boolean>;
}
interface BoolShouldQuery {
  [key: string]: unknown;
  bool: { should: MatchPhraseQuery[] };
}
interface RangeQuery {
  [key: string]: unknown;
  range: Record<string, { gte?: string | number; lt?: string | number }>;
}

const hasExists = (query: Record<string, unknown>): query is ExistsQuery => query.exists != null;
const hasMatchPhrase = (query: Record<string, unknown>): query is MatchPhraseQuery =>
  query.match_phrase != null;
const hasBoolShould = (query: Record<string, unknown>): query is BoolShouldQuery =>
  (query.bool as { should?: unknown } | undefined)?.should != null;
const hasRange = (query: Record<string, unknown>): query is RangeQuery => query.range != null;

/**
 * Translates a single insight filter into a KQL clause, or `null` if it cannot be represented.
 * Handles the filter shapes produced by `buildFiltersFromInsightProviders` (exists, phrase,
 * phrases, range, and one level of combined AND filters).
 */
const insightFilterToKql = (filter: Filter): string | null => {
  const negate = Boolean(filter.meta?.negate);
  const wrap = (clause: string | null): string | null => {
    if (!clause) {
      return null;
    }
    return negate ? `NOT (${clause})` : clause;
  };

  if (filter.meta?.type === 'combined') {
    const params = (filter.meta.params as Filter[] | undefined) ?? [];
    const inner = params
      .map(insightFilterToKql)
      .filter((clause): clause is string => Boolean(clause))
      .join(' and ');
    return inner ? wrap(`(${inner})`) : null;
  }

  const query = filter.query as Record<string, unknown> | undefined;
  if (!query) {
    return null;
  }

  if (hasExists(query)) {
    return wrap(`${query.exists.field} :*`);
  }

  if (hasMatchPhrase(query)) {
    const [field] = Object.keys(query.match_phrase);
    if (!field) {
      return null;
    }
    return wrap(`${field} : ${prepareKQLParam(query.match_phrase[field])}`);
  }

  if (hasBoolShould(query)) {
    const { should } = query.bool;
    const [field] = Object.keys(should[0]?.match_phrase ?? {});
    if (!field) {
      return null;
    }
    const values = should.map((clause) => prepareKQLParam(clause.match_phrase[field])).join(' or ');
    return wrap(`${field} : (${values})`);
  }

  if (hasRange(query)) {
    const [field] = Object.keys(query.range);
    if (!field) {
      return null;
    }
    const range = query.range[field];
    const clauses: string[] = [];
    if (range?.gte != null && range.gte !== '') {
      clauses.push(`${field} >= ${prepareKQLParam(range.gte)}`);
    }
    if (range?.lt != null && range.lt !== '') {
      clauses.push(`${field} < ${prepareKQLParam(range.lt)}`);
    }
    return clauses.length ? wrap(clauses.join(' and ')) : null;
  }

  return null;
};

const buildKqlExpression = (
  dataProviders?: DataProvider[] | null,
  filters?: Filter[] | null
): string => {
  const clauses: string[] = [];

  if (dataProviders && dataProviders.length > 0) {
    // `buildGlobalQuery` only uses `browserFields` to special-case nested/date fields; passing an
    // empty object degrades gracefully to plain `field : value` clauses without requiring sourcerer.
    const dataProviderQuery = buildGlobalQuery(dataProviders, {});
    if (dataProviderQuery) {
      clauses.push(dataProviderQuery);
    }
  }

  if (filters && filters.length > 0) {
    const filtersQuery = filters
      .map(insightFilterToKql)
      .filter((clause): clause is string => Boolean(clause))
      .join(' and ');
    if (filtersQuery) {
      clauses.push(filtersQuery);
    }
  }

  return clauses.join(' and ');
};

/**
 * Provides helpers to open a timeline in a new Security Solution tab. Used as a fallback when the
 * investigation guide is rendered outside of the Security Solution app (e.g. in Discover), where the
 * in-app timeline (Redux store + bottom bar) is not mounted and the usual in-place open does nothing.
 */
export const useOpenTimelineInNewTab = () => {
  const {
    services: { application },
  } = useKibana();

  const openNewTab = useCallback(
    (path: string) => {
      const url = application.getUrlForApp(APP_UI_ID, { path: `alerts${path}` });
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [application]
  );

  const openSavedTimelineInNewTab = useCallback(
    (id: string) => {
      openNewTab(getTimelineUrl(id));
    },
    [openNewTab]
  );

  const openAdHocTimelineInNewTab = useCallback(
    ({ dataProviders, filters, timeRange }: OpenAdHocTimelineParams) => {
      const expression = buildKqlExpression(dataProviders, filters);

      const timelineState = {
        activeTab: 'query',
        isOpen: true,
        ...(expression ? { query: { kind: 'kuery', expression } } : {}),
      };

      const searchParams = new URLSearchParams({ timeline: encode(timelineState) });

      if (timeRange) {
        const timerangeState = {
          global: { linkTo: [], timerange: timeRange },
          timeline: { linkTo: [], timerange: timeRange },
        };
        searchParams.set('timerange', encode(timerangeState));
      }

      openNewTab(`?${searchParams.toString()}`);
    },
    [openNewTab]
  );

  return { openSavedTimelineInNewTab, openAdHocTimelineInNewTab };
};
