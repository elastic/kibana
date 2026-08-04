/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import { distance } from 'fastest-levenshtein';
import { of } from 'rxjs';
import { NIGHTSHIFT_PATH, OBSERVABILITY_BASE_PATH } from '../../common/locators/paths';

const APPLICATION_RESULT_TYPE = 'application';
const SEARCH_TERMS = ['nightshift', 'significant events'] as const;

const EXACT_MATCH_SCORE = 100;
const PREFIX_MATCH_SCORE = 90;
const SUBSTRING_MATCH_SCORE = 75;
const MIN_FUZZY_SCORE = 60;

const scoreSearchTerm = (searchTerm: string): number => {
  if (!searchTerm) {
    return 0;
  }
  if (SEARCH_TERMS.includes(searchTerm as (typeof SEARCH_TERMS)[number])) {
    return EXACT_MATCH_SCORE;
  }
  if (SEARCH_TERMS.some((candidate) => candidate.startsWith(searchTerm))) {
    return PREFIX_MATCH_SCORE;
  }
  if (SEARCH_TERMS.some((candidate) => candidate.includes(searchTerm))) {
    return SUBSTRING_MATCH_SCORE;
  }
  const closestDistance = Math.min(
    ...SEARCH_TERMS.map((candidate) => distance(searchTerm, candidate))
  );
  const longestLength = Math.max(searchTerm.length, ...SEARCH_TERMS.map(({ length }) => length));
  const fuzzyScore = Math.floor((1 - closestDistance / longestLength) * 100);
  return fuzzyScore >= MIN_FUZZY_SCORE ? fuzzyScore : 0;
};

export const createNightshiftGlobalSearchProvider = ({
  isAvailable,
  title,
}: {
  isAvailable: () => boolean;
  title: string;
}): GlobalSearchResultProvider => ({
  id: 'nightshift',
  find: ({ tags, term, types }) => {
    const searchTerm = term?.trim().toLowerCase() ?? '';
    const score = scoreSearchTerm(searchTerm);

    if (
      !isAvailable() ||
      tags?.length ||
      (types && !types.includes(APPLICATION_RESULT_TYPE)) ||
      score === 0
    ) {
      return of([]);
    }

    return of([
      {
        id: 'nightshift',
        title,
        type: APPLICATION_RESULT_TYPE,
        icon: 'logoObservability',
        url: {
          path: `${OBSERVABILITY_BASE_PATH}${NIGHTSHIFT_PATH}`,
          prependBasePath: true,
        },
        meta: {
          categoryId: DEFAULT_APP_CATEGORIES.observability.id,
          categoryLabel: DEFAULT_APP_CATEGORIES.observability.label,
        },
        score,
      },
    ]);
  },
  getSearchableTypes: () => [APPLICATION_RESULT_TYPE],
});
