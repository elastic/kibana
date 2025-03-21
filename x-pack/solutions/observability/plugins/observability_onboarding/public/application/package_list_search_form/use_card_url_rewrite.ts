/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { OBSERVABILITY_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability';

export function buildOnboardingPath({
  category,
  search,
}: {
  category?: string | null;
  search?: string;
}): string {
  if (!category && !search) return '?';
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  return `?${params.toString()}`;
}

export function addPathParamToUrl(
  url: string,
  params: {
    category?: string | null;
    search?: string;
  }
) {
  const onboardingPath = buildOnboardingPath(params);
  const encoded = encodeURIComponent(onboardingPath);
  const paramsString = `returnAppId=${OBSERVABILITY_ONBOARDING_APP_ID}&returnPath=${encoded}`;

  if (url.indexOf('?') >= 0) {
    return `${url}&${paramsString}`;
  }
  return `${url}?${paramsString}`;
}

export function useCardUrlRewrite(props: { category?: string | null; search?: string }) {
  const params = new URLSearchParams();
  if (props.category) params.append('category', props.category);
  if (props.search) params.append('search', props.search);

  return (card: IntegrationCardItem) => ({
    ...card,
    url:
      card.url.indexOf('/app/integrations') >= 0
        ? addPathParamToUrl(card.url, { category: props.category, search: props.search })
        : card.url,
  });
}
