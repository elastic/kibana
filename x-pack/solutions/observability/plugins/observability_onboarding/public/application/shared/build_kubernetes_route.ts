/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Search params that only make sense on the landing/category page and must not
 * be forwarded into the Kubernetes OTel flow (e.g. `/kubernetes?category=host`).
 */
const LANDING_ONLY_SEARCH_PARAMS = ['category', 'search'] as const;

/**
 * Builds the path to the Kubernetes OTel flow, preserving the current search
 * string but stripping landing-only params so the destination URL (and the
 * Return link that mirrors it) stays clean.
 */
export const buildKubernetesRoutePath = (search: string): string => {
  const params = new URLSearchParams(search);
  LANDING_ONLY_SEARCH_PARAMS.forEach((param) => params.delete(param));
  const next = params.toString();
  return `/kubernetes${next ? `?${next}` : ''}`;
};
