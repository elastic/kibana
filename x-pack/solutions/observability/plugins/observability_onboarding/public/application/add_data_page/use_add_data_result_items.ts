/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { IntegrationCardItem, UseLocalSearchType } from '@kbn/fleet-plugin/public';
import { useCardUrlRewrite } from '../package_list_search_form/use_card_url_rewrite';

const ALLOWED_CATEGORIES = new Set(['observability', 'os_system']);

/**
 * The o11y item pipeline feeding AddDataSearchResults: category filter, text match
 * (Fleet's own `useLocalSearch`, so results agree with the Integrations app by
 * construction), return-path URL rewrite. `useLocalSearch` comes as an argument
 * because the caller gates on Fleet's async-loaded module.
 */
export function useAddDataResultItems({
  searchTerm,
  allCards,
  isLoading,
  useLocalSearch,
}: {
  searchTerm: string;
  allCards: IntegrationCardItem[];
  isLoading: boolean;
  useLocalSearch: UseLocalSearchType;
}): { items: IntegrationCardItem[] } {
  const rewriteUrl = useCardUrlRewrite({ category: null, search: searchTerm });

  const categoryFiltered = useMemo(
    () =>
      allCards.filter((card) =>
        card.categories.some((category) => ALLOWED_CATEGORIES.has(category))
      ),
    [allCards]
  );

  const localSearch = useLocalSearch(categoryFiltered, isLoading);

  const items = useMemo(() => {
    const term = searchTerm.trim();
    const matchedIds =
      term && localSearch
        ? new Set((localSearch.search(term) as IntegrationCardItem[]).map(({ id }) => id))
        : null;
    const results = matchedIds
      ? categoryFiltered.filter(({ id }) => matchedIds.has(id))
      : categoryFiltered;
    return results.map(rewriteUrl);
  }, [categoryFiltered, localSearch, searchTerm, rewriteUrl]);

  return { items };
}
