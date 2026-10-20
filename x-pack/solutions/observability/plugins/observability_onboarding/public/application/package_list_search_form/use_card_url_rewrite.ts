/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';

export interface OnboardingReturnState {
  category?: string | null;
  search?: string;
  /** Group id of the collection chooser to reopen when the user returns. */
  collection?: string;
}

export function buildOnboardingPath({
  category,
  search,
  collection,
}: OnboardingReturnState): string {
  if (!category && !search && !collection) return '?';
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  if (collection) params.append('collection', collection);
  return `?${params.toString()}`;
}

export function addPathParamToUrl(url: string, params: OnboardingReturnState) {
  const onboardingPath = buildOnboardingPath(params);
  const encoded = encodeURIComponent(onboardingPath);
  const paramsString = `returnAppId=${OBSERVABILITY_ONBOARDING_APP_ID}&returnPath=${encoded}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
}

export const rewriteCardUrl = <T extends IntegrationCardItem>(
  card: T,
  params: OnboardingReturnState
): T => ({
  ...card,
  url: card.url.indexOf('/app/integrations') >= 0 ? addPathParamToUrl(card.url, params) : card.url,
});

// Collection ids belong to the members inside a collection card, which the
// callers rewrite themselves with `rewriteCardUrl`.
export function useCardUrlRewrite({ category, search }: Omit<OnboardingReturnState, 'collection'>) {
  return useCallback(
    <T extends IntegrationCardItem>(card: T) => rewriteCardUrl(card, { category, search }),
    [category, search]
  );
}
