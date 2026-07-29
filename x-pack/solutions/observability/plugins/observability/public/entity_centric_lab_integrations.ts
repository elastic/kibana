/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Super-short-term lab: integrations registry + starred-integrations stream
 * used to build the "Infrastructure" nav panel.
 *
 * This is a *deliberate, self-contained duplicate* of the store that lives in
 * `@kbn/entity-centric-lab-flyout` (consumed by the Streams app). The nav must
 * not import that package's barrel: in dev builds the barrel eagerly pulls the
 * entire flyout graph (EntityFlyout, dashboard render context, agent-builder
 * attachment, …) into the Observability bundle, and a failure evaluating any
 * of those modules takes the whole solution nav down. Keeping a tiny,
 * dependency-free copy here isolates the nav from that graph.
 *
 * Cross-bundle state stays in sync because both copies anchor the same
 * `BehaviorSubject` on `globalThis` under the SAME key and persist to the SAME
 * `localStorage` key — whichever bundle initialises first wins, the other
 * reuses it. So starring an integration from a Streams page re-emits to this
 * nav's subscription, and vice-versa. The registry is static data, kept
 * identical to the package copy (ids must match for deep-links to resolve).
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';

export interface IntegrationSummary {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

/** Keep in sync with `INSTALLED_INTEGRATIONS` in `@kbn/entity-centric-lab-flyout`. */
const INSTALLED_INTEGRATIONS: readonly IntegrationSummary[] = [
  { id: 'aws-ec2', name: 'AWS EC2', icon: 'logoAWS' },
  { id: 'aws-lambda', name: 'AWS Lambda', icon: 'logoAWS' },
  { id: 'aws-rds', name: 'AWS RDS', icon: 'logoAWS' },
  { id: 'azure', name: 'Azure', icon: 'logoAzure' },
  { id: 'kubernetes', name: 'Kubernetes', icon: 'logoKubernetes' },
  { id: 'something-else', name: 'Something else', icon: 'package' },
];

export const getInstalledIntegrations = (): readonly IntegrationSummary[] => INSTALLED_INTEGRATIONS;

/**
 * Deep-link id for an integration's detail page, e.g. `aws-ec2` ->
 * `integrationsAwsEc2`. MUST match `getIntegrationDeepLinkId` in
 * `@kbn/entity-centric-lab-flyout` (streams_app registers the matching deep
 * link) so the nav's `streams:<id>` link resolves. Using `link` rather than a
 * raw `href` matters: the chrome nav *throws* on a non-absolute href (blanking
 * the whole side nav), but silently drops an unresolved `link`.
 */
export const getIntegrationDeepLinkId = (id: string): string =>
  `integrations${id
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')}`;

// Must match the keys used in `@kbn/entity-centric-lab-flyout/src/integrations_favorites.ts`.
const STORAGE_KEY = 'entityCentricLab.integrationFavorites.v1';
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_integrationFavorites_v1__' as const;

interface SharedState {
  readonly subject: BehaviorSubject<string[]>;
  hydrated: boolean;
}

const readStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<string[]>([]), hydrated: false };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const hydrateOnce = (): SharedState => {
  const state = getSharedState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const stored = readStorage();
  if (stored.length > 0) state.subject.next(stored);
  return state;
};

/** RxJS stream of favorited integration ids; drives the nav's Starred section. */
export const getIntegrationFavorites$ = (): Observable<string[]> =>
  hydrateOnce().subject.asObservable();
