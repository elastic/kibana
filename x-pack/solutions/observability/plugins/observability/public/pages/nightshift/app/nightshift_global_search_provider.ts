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
import { NIGHTSHIFT_PATH, OBSERVABILITY_BASE_PATH } from '../../../../common/locators/paths';

const APPLICATION_RESULT_TYPE = 'application';
const SEARCH_TERMS = ['nightshift', 'significant events'] as const;

const scoreSearchTerm = (searchTerm: string): number => {
  if (SEARCH_TERMS.includes(searchTerm as (typeof SEARCH_TERMS)[number])) {
    return 100;
  }
  if (SEARCH_TERMS.some((candidate) => candidate.startsWith(searchTerm))) {
    return 90;
  }
  if (SEARCH_TERMS.some((candidate) => candidate.includes(searchTerm))) {
    return 75;
  }
  const closestDistance = Math.min(
    ...SEARCH_TERMS.map((candidate) => distance(searchTerm, candidate))
  );
  const longestLength = Math.max(searchTerm.length, ...SEARCH_TERMS.map(({ length }) => length));
  const fuzzyScore = Math.floor((1 - closestDistance / longestLength) * 100);
  return fuzzyScore >= 60 ? fuzzyScore : 0;
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
