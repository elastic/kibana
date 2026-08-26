/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Super-short-term lab: integrations registry + starred-integrations store used
 * to build the "Infrastructure" nav panel and its optional grouped ("nested
 * nav") mode.
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
 * `BehaviorSubject`s on `globalThis` under the SAME keys and persist to the
 * SAME `localStorage` keys — whichever bundle initialises first wins, the other
 * reuses it. So starring/grouping from a Streams page re-emits to this nav's
 * subscription, and vice-versa. The registry is static data, kept identical to
 * the package copy (ids must match for deep-links to resolve).
 */

import { useSyncExternalStore } from 'react';
import { BehaviorSubject, map } from 'rxjs';
import type { Observable } from 'rxjs';

export interface IntegrationSummary {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

/** A user-created group of starred integrations. */
export interface FavoriteGroup {
  readonly id: string;
  readonly name: string;
  readonly integrationIds: readonly string[];
}

/** The full favorites state: ungrouped stars plus named groups. */
export interface FavoritesState {
  readonly ungrouped: readonly string[];
  readonly groups: readonly FavoriteGroup[];
}

const EMPTY_STATE: FavoritesState = { ungrouped: [], groups: [] };

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
const STORAGE_KEY_V1 = 'entityCentricLab.integrationFavorites.v1';
const STORAGE_KEY_V2 = 'entityCentricLab.integrationFavorites.v2';
const NESTED_NAV_STORAGE_KEY = 'entityCentricLab.nestedNavEnabled';
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_integrationFavorites_v2__' as const;
const GLOBAL_NESTED_KEY = '__kbnEntityCentricLab_nestedNavEnabled__' as const;

interface SharedState {
  readonly subject: BehaviorSubject<FavoritesState>;
  hydrated: boolean;
}

interface NestedFlagState {
  readonly subject: BehaviorSubject<boolean>;
  hydrated: boolean;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const sanitizeState = (value: unknown): FavoritesState | null => {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as { ungrouped?: unknown; groups?: unknown };
  if (!isStringArray(candidate.ungrouped)) return null;
  if (!Array.isArray(candidate.groups)) return null;

  const groups: FavoriteGroup[] = [];
  for (const rawGroup of candidate.groups) {
    if (typeof rawGroup !== 'object' || rawGroup === null) return null;
    const group = rawGroup as { id?: unknown; name?: unknown; integrationIds?: unknown };
    if (typeof group.id !== 'string') return null;
    if (typeof group.name !== 'string') return null;
    if (!isStringArray(group.integrationIds)) return null;
    groups.push({ id: group.id, name: group.name, integrationIds: group.integrationIds });
  }
  return { ungrouped: candidate.ungrouped, groups };
};

const readState = (): FavoritesState => {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = sanitizeState(JSON.parse(rawV2));
      if (parsed) return parsed;
    }
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed: unknown = JSON.parse(rawV1);
      if (isStringArray(parsed) && parsed.length > 0) {
        return { ungrouped: parsed, groups: [] };
      }
    }
  } catch {
    // Corrupt or blocked storage — fall through to the empty state.
  }
  return EMPTY_STATE;
};

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<FavoritesState>(EMPTY_STATE), hydrated: false };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const hydrateOnce = (): SharedState => {
  const state = getSharedState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const stored = readState();
  if (stored.ungrouped.length > 0 || stored.groups.length > 0) {
    state.subject.next(stored);
  }
  return state;
};

const flattenIds = (state: FavoritesState): string[] => [
  ...state.ungrouped,
  ...state.groups.flatMap((group) => [...group.integrationIds]),
];

/** RxJS stream of the full grouped favorites state; drives the Starred section. */
export const getFavoritesState$ = (): Observable<FavoritesState> =>
  hydrateOnce().subject.asObservable();

/** RxJS stream of favorited integration ids (flattened). */
export const getIntegrationFavorites$ = (): Observable<string[]> =>
  getFavoritesState$().pipe(map(flattenIds));

// ---------------------------------------------------------------------------
// Nested-nav opt-in flag (mirrors the package store)
// ---------------------------------------------------------------------------

const readNestedFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NESTED_NAV_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeNestedFlag = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NESTED_NAV_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage blocked — the in-memory copy is still good.
  }
};

const getNestedFlagState = (): NestedFlagState => {
  const root = globalThis as unknown as Record<string, NestedFlagState | undefined>;
  let state = root[GLOBAL_NESTED_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<boolean>(false), hydrated: false };
    root[GLOBAL_NESTED_KEY] = state;
  }
  return state;
};

const hydrateNestedOnce = (): NestedFlagState => {
  const state = getNestedFlagState();
  if (state.hydrated) return state;
  state.hydrated = true;
  if (readNestedFlag()) state.subject.next(true);
  return state;
};

export const getNestedNavEnabled = (): boolean => hydrateNestedOnce().subject.getValue();

export const setNestedNavEnabled = (enabled: boolean): void => {
  const state = hydrateNestedOnce();
  if (state.subject.getValue() === enabled) return;
  writeNestedFlag(enabled);
  state.subject.next(enabled);
};

export const getNestedNavEnabled$ = (): Observable<boolean> =>
  hydrateNestedOnce().subject.asObservable();

export const useNestedNavEnabled = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      const subscription = hydrateNestedOnce().subject.subscribe(() => listener());
      return () => subscription.unsubscribe();
    },
    getNestedNavEnabled,
    () => false
  );

// ---------------------------------------------------------------------------
// Nav search query (mirrors @kbn/entity-centric-lab-flyout; same global key)
// ---------------------------------------------------------------------------

const GLOBAL_SEARCH_KEY = '__kbnEntityCentricLab_integrationsSearch__' as const;

const getSearchState = (): BehaviorSubject<string> => {
  const root = globalThis as unknown as Record<string, BehaviorSubject<string> | undefined>;
  let subject = root[GLOBAL_SEARCH_KEY];
  if (!subject) {
    subject = new BehaviorSubject<string>('');
    root[GLOBAL_SEARCH_KEY] = subject;
  }
  return subject;
};

export const getIntegrationsSearch = (): string => getSearchState().getValue();

export const setIntegrationsSearch = (query: string): void => {
  const subject = getSearchState();
  if (subject.getValue() === query) return;
  subject.next(query);
};

/** RxJS stream of the nav search query; drives the nav's filtered rendering. */
export const getIntegrationsSearch$ = (): Observable<string> => getSearchState().asObservable();

// ---------------------------------------------------------------------------
// Saved views (Latest lab) — read-only mirror of streams_app `use_saved_views`
// ---------------------------------------------------------------------------
//
// In the Latest lab the entity-inventory "views" a user saves surface as a
// "Saved views" section in this nav. The source of truth is streams_app's
// localStorage store; here we keep a tiny, read-only mirror so the nav can
// render the section and rebuild it whenever a view is saved / renamed /
// deleted. Cross-bundle sync rides the same window event streams_app dispatches
// on every write — no globalThis subject sharing needed because this bundle
// only *reads* (streams_app owns the writes). Keep the storage key + event name
// in sync with `use_saved_views.ts`.
//
// Only the fields the nav needs are parsed: `id`, `name`, and the `category`
// the view targets (drives the deep href).

export interface NavSavedView {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  // Cloud sub-scope for views saved on a `/entities/cloud/{provider}[/{service}]`
  // route. Drives a deep href so the view reloads its exact page instead of the
  // whole Cloud category. Both `null` for non-cloud views.
  readonly cloudProvider: string | null;
  readonly cloudService: string | null;
  // Whether this view is the ElasticOn session-landing default. Drives the nav's
  // "Default" marker + sort-to-top. `false` for every view when no default is set.
  readonly isDefault: boolean;
}

const SAVED_VIEWS_STORAGE_KEY = 'entityCentricLab.savedViews.v1';
const SAVED_VIEWS_DEFAULT_KEY = 'entityCentricLab.savedViews.defaultId.v1';
const SAVED_VIEWS_CHANGE_EVENT = 'entity-centric-lab:saved-views-changed';
const GLOBAL_SAVED_VIEWS_KEY = '__kbnEntityCentricLab_savedViews__' as const;

interface SavedViewsSharedState {
  readonly subject: BehaviorSubject<NavSavedView[]>;
  hydrated: boolean;
}

const parseSavedViews = (raw: string | null, defaultId: string | null): NavSavedView[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const views: NavSavedView[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const candidate = entry as { id?: unknown; name?: unknown; state?: unknown };
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue;
      const state = (candidate.state ?? {}) as {
        category?: unknown;
        cloudProvider?: unknown;
        cloudService?: unknown;
      };
      const category = typeof state.category === 'string' ? state.category : null;
      // Cloud sub-scope only applies under the Cloud category.
      const cloudProvider =
        category === 'cloud' && typeof state.cloudProvider === 'string'
          ? state.cloudProvider
          : null;
      const cloudService =
        category === 'cloud' && typeof state.cloudService === 'string' ? state.cloudService : null;
      views.push({
        id: candidate.id,
        name: candidate.name,
        category,
        cloudProvider,
        cloudService,
        isDefault: candidate.id === defaultId,
      });
    }
    return views;
  } catch {
    return [];
  }
};

const readDefaultViewId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SAVED_VIEWS_DEFAULT_KEY);
  } catch {
    return null;
  }
};

const readSavedViews = (): NavSavedView[] => {
  if (typeof window === 'undefined') return [];
  try {
    return parseSavedViews(
      window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY),
      readDefaultViewId()
    );
  } catch {
    return [];
  }
};

const getSavedViewsState = (): SavedViewsSharedState => {
  const root = globalThis as unknown as Record<string, SavedViewsSharedState | undefined>;
  let state = root[GLOBAL_SAVED_VIEWS_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<NavSavedView[]>([]), hydrated: false };
    root[GLOBAL_SAVED_VIEWS_KEY] = state;
  }
  return state;
};

const hydrateSavedViewsOnce = (): SavedViewsSharedState => {
  const state = getSavedViewsState();
  if (state.hydrated) return state;
  state.hydrated = true;
  const emit = () => state.subject.next(readSavedViews());
  emit();
  if (typeof window !== 'undefined') {
    // streams_app dispatches this custom event on every save / rename / delete;
    // the native `storage` event covers writes made in other tabs.
    window.addEventListener(SAVED_VIEWS_CHANGE_EVENT, emit);
    window.addEventListener('storage', (event) => {
      if (
        event.key === null ||
        event.key === SAVED_VIEWS_STORAGE_KEY ||
        event.key === SAVED_VIEWS_DEFAULT_KEY
      ) {
        emit();
      }
    });
  }
  return state;
};

/** RxJS stream of saved views; drives the Latest nav's "Saved views" section. */
export const getSavedViews$ = (): Observable<NavSavedView[]> =>
  hydrateSavedViewsOnce().subject.asObservable();
