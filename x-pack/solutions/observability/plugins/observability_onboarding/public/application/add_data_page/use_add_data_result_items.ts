/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { useIntegrationTiles } from './use_integration_tiles';
import { useCardUrlRewrite } from '../package_list_search_form/use_card_url_rewrite';
import { matchSearchItems, type SearchItemsMatcher } from './match_search_items';

const ALLOWED_CATEGORIES = new Set(['observability', 'os_system']);

/**
 * The o11y item pipeline feeding AddDataSearchResults: Fleet package list
 * (already loaded by the caller-provided hook), category filter, curated
 * quickstart cards, text match, onboarding return-path URL rewrite.
 * `useAvailablePackages` arrives as an argument because the Fleet module is
 * loaded async by the container component (hooks cannot be called
 * conditionally, so the caller mounts this only after the module resolves).
 *
 * `allCards`, not `filteredCards`: `filteredCards` is pre-filtered by Fleet's
 * own router-derived category state, which is empty on the onboarding route
 * today but wrong the moment this pipeline runs embedded on Integrations
 * routes. `allCards` also skips the agentless preference filter, which is a
 * no-op on this page with default settings.
 */
export function useAddDataResultItems({
  searchTerm,
  useAvailablePackages,
  matchItems = matchSearchItems,
}: {
  searchTerm: string;
  useAvailablePackages: AvailablePackagesHookType;
  matchItems?: SearchItemsMatcher;
}): { items: IntegrationCardItem[]; isLoading: boolean; error?: Error } {
  const customCards = useIntegrationTiles();
  const { allCards, isLoading, eprPackageLoadingError } = useAvailablePackages({
    prereleaseIntegrationsEnabled: true,
  });
  const rewriteUrl = useCardUrlRewrite({ category: null, search: searchTerm });

  const items = useMemo(() => {
    const categoryFiltered = customCards
      .concat(allCards)
      .filter((card) => card.categories.some((category) => ALLOWED_CATEGORIES.has(category)));
    return matchItems(categoryFiltered, searchTerm).map(rewriteUrl);
  }, [customCards, allCards, matchItems, searchTerm, rewriteUrl]);

  return { items, isLoading, error: eprPackageLoadingError ?? undefined };
}
