/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  AvailablePackagesHookType,
  IntegrationCardItem,
  UseLocalSearchType,
} from '@kbn/fleet-plugin/public';
import {
  rewriteCardUrl,
  useCardUrlRewrite,
} from '../package_list_search_form/use_card_url_rewrite';
import { getCollectionGroupId, isCollectionCard } from './collection_card';

const ALLOWED_CATEGORIES = new Set(['observability', 'os_system']);

/**
 * The o11y item pipeline feeding AddDataSearchResults: category filter, text
 * match (Fleet's own `useLocalSearch`, so results agree with the Integrations
 * app by construction), return-path URL rewrite. A collection card's member
 * links are what actually navigate, so they get the same rewrite as top-level
 * cards plus the group id that reopens their chooser on return. The curated
 * tiles are not mirrored in: they stay visible below the
 * results, so mirroring only produced duplicates of the EPR cards. Both Fleet
 * hooks arrive as arguments because the caller loads the module async.
 */
export function useAddDataResultItems({
  searchTerm,
  useAvailablePackages,
  useLocalSearch,
}: {
  searchTerm: string;
  useAvailablePackages: AvailablePackagesHookType;
  useLocalSearch: UseLocalSearchType;
}): { items: IntegrationCardItem[]; isLoading: boolean; error?: Error } {
  // `allCards`, not `filteredCards`: the latter is pre-filtered by Fleet's own
  // router-derived category state, which is wrong outside the onboarding route.
  const { allCards, isLoading, eprPackageLoadingError } = useAvailablePackages({
    prereleaseIntegrationsEnabled: true,
  });
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
    return results.map((card) => {
      const rewritten = rewriteUrl(card);
      if (!isCollectionCard(rewritten)) return rewritten;
      // Members are the only cards that navigate away, so they alone carry the
      // group id that reopens this chooser on return.
      const collection = getCollectionGroupId(rewritten);
      return {
        ...rewritten,
        groupMembers: rewritten.groupMembers.map((member) =>
          rewriteCardUrl(member, { category: null, search: searchTerm, collection })
        ),
      };
    });
  }, [categoryFiltered, localSearch, searchTerm, rewriteUrl]);

  return { items, isLoading, error: eprPackageLoadingError ?? undefined };
}
