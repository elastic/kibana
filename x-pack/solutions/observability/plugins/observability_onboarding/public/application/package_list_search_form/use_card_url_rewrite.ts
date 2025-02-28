/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function toOnboardingPath({
  basePath,
  category,
  search,
}: {
  basePath?: string;
  category?: string | null;
  search?: string;
}): string | null {
  if (typeof basePath !== 'string' && !basePath) return null;
  const path = `${basePath}/app/observabilityOnboarding`;
  if (!category && !search) return path;
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  return `${path}?${params.toString()}`;
}

export function addPathParamToUrl(url: string, onboardingLink: string) {
  const encoded = encodeURIComponent(onboardingLink);
  if (url.indexOf('?') >= 0) {
    return `${url}&observabilityOnboardingLink=${encoded}`;
  }
  return `${url}?observabilityOnboardingLink=${encoded}`;
}

export function useCardUrlRewrite(props: { category?: string | null; search?: string }) {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get();
  const onboardingLink = useMemo(() => toOnboardingPath({ basePath, ...props }), [basePath, props]);
  return (card: IntegrationCardItem) => ({
    ...card,
    url:
      card.url.indexOf('/app/integrations') >= 0 && onboardingLink
        ? addPathParamToUrl(card.url, onboardingLink)
        : card.url,
  });
}
