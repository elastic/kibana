/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  HttpFetchOptionsWithPath,
  HttpStart,
  IToasts,
} from '@kbn/core/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import {
  getDuplicateDetectionsManager,
  type DeveloperToolbarRegistry,
} from './duplicate_detections_manager';
import { getDetectorSettingsStore, type DetectorSettings } from './duplicate_detections_settings';
import { getPluginOwnersStore, type PluginOwnersSnapshot } from './duplicate_detections_owners';

/**
 * Options for {@link startDuplicateRequestDetector}.
 *
 * @internal POC – intended for development-time use only. Callers MUST
 * gate this on `initializerContext.env.mode.dev` (and skip it in production
 * builds) to avoid runtime overhead for end-users.
 */
export interface DuplicateRequestDetectorOptions {
  /** Public HTTP service (used to attach an interceptor). */
  http: HttpStart;
  /** Public application service – used to tag each detection with the active Kibana app. */
  application: ApplicationStart;
  /** Public notifications/toasts service (used to surface the consolidated toast). */
  toasts: IToasts;
  /** Core overlays service – needed to open the deep-dive flyout from the toast. */
  overlays: OverlayStart;
  /** Core rendering service – needed to render a React `MountPoint` inside the toast. */
  rendering: RenderingService;
  /**
   * Optional label for the plugin that started the detector. Used only as a
   * fallback when no Kibana app is currently active (e.g. login screen).
   */
  source?: string;
  /**
   * Sliding window (ms) over which we track in-flight + recently completed
   * requests for duplicate detection. Bursts within this window that share
   * the same URL + payload + response signature are flagged.
   *
   * @default 5000
   */
  windowMs?: number;
  /**
   * Minimum number of matching occurrences (inclusive) within the window
   * required to record a detection event. `2` means "any duplicate".
   *
   * @default 2
   */
  duplicateThreshold?: number;
  /**
   * Per-endpoint cooldown (ms) between consecutive detection events so a
   * pathological re-render loop produces one entry, not dozens.
   *
   * @default 10000
   */
  toastCooldownMs?: number;
  /**
   * How long the consolidated toast stays on screen (ms). Set high because
   * we want developers to actually see the count accumulate.
   *
   * @default 60000
   */
  toastLifeTimeMs?: number;
  /**
   * Path prefixes to ignore. Useful for noisy infrastructure endpoints that
   * are not actionable for the plugin author (e.g. core-loaded translations,
   * task-poller probes).
   *
   * @default ['/translations', '/internal/core', '/api/licensing', '/api/status']
   */
  ignoredPathPrefixes?: string[];
  /**
   * Optional Kibana developer-toolbar contract (from the `developerToolbar`
   * plugin). When provided, the detector registers a button in the toolbar
   * with a count badge and a click-to-open-flyout handler. Idempotent across
   * multiple detector starts (only the first registration wins).
   *
   * Omit when the host plugin isn't running with `developerToolbar` enabled
   * (e.g. CI builds, packaged distributions). The detector falls back to
   * toast-only mode in that case.
   */
  developerToolbar?: DeveloperToolbarRegistry;
}

interface TrackedRequest {
  /** Tier-2 fingerprint (method + url + query + body). */
  payloadFingerprint: string;
  /** Tier-3 fingerprint (response body). `null` while the request is in-flight. */
  responseFingerprint: string | null;
  /** Timestamp the request was issued. */
  issuedAt: number;
}

interface DetectorHandle {
  /** Removes the interceptor and clears internal per-source state. */
  stop: () => void;
}

const DEFAULT_WINDOW_MS = 5_000;
const DEFAULT_DUPLICATE_THRESHOLD = 2;
const DEFAULT_TOAST_COOLDOWN_MS = 10_000;
const DEFAULT_TOAST_LIFETIME_MS = 60_000;
const DEFAULT_IGNORED_PREFIXES = [
  '/translations',
  '/internal/core',
  '/api/licensing',
  '/api/status',
];

/**
 * Module-level singleton state. Kibana runs **every** registered HTTP interceptor
 * on **every** request, so if both SLO and Synthetics each registered their own
 * interceptor they'd both observe the same `/api/ui_counters/_report` request
 * and record two events with conflicting `source` tags. We attach the
 * interceptor exactly once per tab and let subsequent calls reuse it.
 */
let activeInstance: DetectorHandle | null = null;

/**
 * Inert handle returned in production builds – `stop()` is a no-op so callers
 * can keep their lifecycle code unchanged regardless of the environment.
 */
const INERT_HANDLE: DetectorHandle = { stop: () => {} };

/**
 * Returns `true` when the bundle is built for a non-production environment
 * (development or tests). `@kbn/optimizer` replaces `process.env.NODE_ENV`
 * at build time, so this collapses to a constant in shipped bundles and the
 * dead code is tree-shaken away in production.
 */
const isDevOrTestEnv = (): boolean => process.env.NODE_ENV !== 'production';

/**
 * Attach a tiered duplicate-request detector to Kibana's public HTTP client.
 *
 * **Dev-only.** This function is a no-op in production builds (callers should
 * still gate it on `initializerContext.env.mode.dev` for clarity, but the
 * second-level guard here ensures the interceptor, toast, flyout, and
 * settings store stay completely dormant in distributed Kibana releases).
 *
 * Pipeline:
 *
 *   Tier 1 (URL + method)  ──►  Tier 2 (request payload)  ──►  Tier 3 (response hash)
 *
 * When all three tiers match within the sliding window, the detection is
 * pushed into a singleton manager that owns **one** consolidated toast (a
 * React `MountPoint` with prev/next navigation). Each detection is tagged with
 * the currently-active Kibana app (via `application.currentAppId$`) so the
 * `Source` column reflects "which app the user was in when this happened",
 * not "which plugin's interceptor observed it".
 *
 * Subsequent calls (e.g. from a second plugin) are no-ops and return the
 * existing handle.
 *
 * @returns a handle whose `stop()` removes the interceptor.
 */
export const startDuplicateRequestDetector = ({
  http,
  application,
  toasts,
  overlays,
  rendering,
  source = 'kibana',
  windowMs = DEFAULT_WINDOW_MS,
  duplicateThreshold = DEFAULT_DUPLICATE_THRESHOLD,
  toastCooldownMs = DEFAULT_TOAST_COOLDOWN_MS,
  toastLifeTimeMs = DEFAULT_TOAST_LIFETIME_MS,
  ignoredPathPrefixes = DEFAULT_IGNORED_PREFIXES,
  developerToolbar,
}: DuplicateRequestDetectorOptions): DetectorHandle => {
  if (!isDevOrTestEnv()) {
    return INERT_HANDLE;
  }
  if (activeInstance) {
    return activeInstance;
  }

  const manager = getDuplicateDetectionsManager();
  manager.configure(toasts, overlays, rendering, toastLifeTimeMs, http);
  if (developerToolbar) {
    manager.registerToolbarItem(developerToolbar);
  }

  let currentAppId: string | undefined;
  const appSubscription = application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const settingsStore = getDetectorSettingsStore();
  let settings: DetectorSettings = settingsStore.get();
  const settingsSubscription = settingsStore.settings$.subscribe((next) => {
    settings = next;
  });

  // Best-effort: pull the pluginId -> GitHub-team map so the "scope to my
  // teams" filter and the autocomplete in the settings panel have data to
  // work with. The fetch is fire-and-forget; until it resolves (and any time
  // it fails), the snapshot stays empty and team-scoping silently no-ops.
  const ownersStore = getPluginOwnersStore();
  let ownersSnapshot: PluginOwnersSnapshot = ownersStore.get();
  const ownersSubscription = ownersStore.snapshot$.subscribe((next) => {
    ownersSnapshot = next;
  });
  void ownersStore.ensureLoaded(http);

  const tier1Buckets = new Map<string, TrackedRequest[]>();
  const lastRecordedAt = new Map<string, number>();

  const pruneBucket = (bucket: TrackedRequest[], now: number): TrackedRequest[] => {
    const cutoff = now - windowMs;
    return bucket.filter((entry) => entry.issuedAt >= cutoff);
  };

  const isIgnored = (fetchOptions: Readonly<HttpFetchOptionsWithPath>): boolean => {
    if (!settings.enabled) return true;
    if (shouldIgnore(fetchOptions, ignoredPathPrefixes)) return true;
    if (
      settings.ignoredPathPrefixes.length > 0 &&
      shouldIgnore(fetchOptions, settings.ignoredPathPrefixes)
    ) {
      return true;
    }
    return false;
  };

  const removeInterceptor = http.intercept({
    request(fetchOptions) {
      if (isIgnored(fetchOptions)) {
        return;
      }
      const tier1Key = buildTier1Key(fetchOptions);
      const payloadFingerprint = fingerprintPayload(fetchOptions);
      const now = Date.now();
      const bucket = pruneBucket(tier1Buckets.get(tier1Key) ?? [], now);
      bucket.push({ payloadFingerprint, responseFingerprint: null, issuedAt: now });
      tier1Buckets.set(tier1Key, bucket);
    },
    response(httpResponse) {
      const { fetchOptions, body } = httpResponse;
      if (isIgnored(fetchOptions)) {
        return;
      }
      const tier1Key = buildTier1Key(fetchOptions);
      const bucket = tier1Buckets.get(tier1Key);
      if (!bucket || bucket.length === 0) {
        return;
      }
      const now = Date.now();
      const payloadFingerprint = fingerprintPayload(fetchOptions);
      const responseFingerprint = fingerprintResponseBody(body);

      const pendingEntry = findLastPending(bucket, payloadFingerprint);
      if (pendingEntry) {
        pendingEntry.responseFingerprint = responseFingerprint;
      }

      const pruned = pruneBucket(bucket, now);
      tier1Buckets.set(tier1Key, pruned);

      const duplicates = countMatches(pruned, payloadFingerprint, responseFingerprint);
      if (duplicates < duplicateThreshold) {
        return;
      }

      const inferredSource = inferSource(fetchOptions.path, currentAppId, source);
      // User-driven "scope to plugins" filter.
      if (settings.scopedSources.length > 0 && !settings.scopedSources.includes(inferredSource)) {
        return;
      }
      // User-driven "scope to my teams" filter. Skipped silently when the
      // owners snapshot is empty (e.g. fetch still in flight, or running
      // outside dev mode where the route doesn't exist) so the team filter
      // never produces a false negative just because the data isn't loaded.
      if (
        settings.scopedTeams.length > 0 &&
        ownersSnapshot.knownTeams.length > 0 &&
        !ownsAnyTeam(inferredSource, settings.scopedTeams, ownersSnapshot)
      ) {
        return;
      }

      // Cooldown is keyed by the *full* URL (path + query) so a burst on
      // /api/foo?a=1 doesn't silently suppress a later burst on /api/foo?b=2.
      const cooldownKey = `${tier1Key}?${payloadFingerprint}`;
      const lastShownAt = lastRecordedAt.get(cooldownKey) ?? 0;
      if (now - lastShownAt < toastCooldownMs) {
        return;
      }
      lastRecordedAt.set(cooldownKey, now);

      manager.record({
        source: inferredSource,
        app: currentAppId,
        method: getMethod(fetchOptions),
        path: buildDisplayPath(fetchOptions),
        count: duplicates,
        elapsedMs: computeWindowSpan(pruned, payloadFingerprint, responseFingerprint),
        detectedAt: now,
      });
    },
  });

  const handle: DetectorHandle = {
    stop: () => {
      removeInterceptor();
      appSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
      ownersSubscription.unsubscribe();
      tier1Buckets.clear();
      lastRecordedAt.clear();
      activeInstance = null;
    },
  };
  activeInstance = handle;
  return handle;
};

/**
 * Test-only: drop the module-level singleton state so the next
 * `startDuplicateRequestDetector` call attaches a fresh interceptor.
 */
export const __resetDuplicateRequestDetectorForTests = (): void => {
  activeInstance?.stop();
  activeInstance = null;
};

const buildTier1Key = (fetchOptions: Readonly<HttpFetchOptionsWithPath>): string => {
  return `${getMethod(fetchOptions)} ${fetchOptions.path}`;
};

/**
 * Infer the owning plugin from the URL path. Most Kibana endpoints follow
 * `/api/<plugin>/…` or `/internal/<plugin>/…`, so the first segment after
 * those prefixes is the actionable label for "who is making this request".
 *
 * Falls back to the current Kibana app id (which tells you where the user
 * was when the burst happened), then to the static `source` option (set per
 * plugin) when even that is missing – e.g. on the login screen.
 */
const inferSource = (path: string, currentAppId: string | undefined, fallback: string): string => {
  const match = /^\/(?:api|internal)\/([^/?#]+)/.exec(path);
  if (match) return match[1];
  return currentAppId ?? fallback;
};

/**
 * Returns `true` if any of the GitHub-team handles in `selectedTeams` owns
 * the plugin identified by `source`, per the server-supplied owners snapshot.
 * The intersection lookup is O(selectedTeams) and treats unknown plugins
 * (those not in the snapshot) as not-owned-by-anyone — the conservative
 * choice for a filter, so noise from never-mapped sources doesn't slip
 * through.
 */
const ownsAnyTeam = (
  source: string,
  selectedTeams: readonly string[],
  snapshot: PluginOwnersSnapshot
): boolean => {
  const owners = snapshot.owners[source];
  if (!owners || owners.length === 0) return false;
  return owners.some((team) => selectedTeams.includes(team));
};

/**
 * Build the human-readable path shown in the toast/flyout. Includes the query
 * params (sorted, encoded) so distinct URLs like `?pattern=a` and `?pattern=b`
 * render as visibly different rows in the detections table.
 */
const buildDisplayPath = (fetchOptions: Readonly<HttpFetchOptionsWithPath>): string => {
  const query = fetchOptions.query;
  if (!query || typeof query !== 'object') return fetchOptions.path;

  const params: string[] = [];
  for (const [key] of Object.entries(query as Record<string, unknown>)) {
    const value = (query as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
    } else {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  if (params.length === 0) return fetchOptions.path;

  params.sort();
  return `${fetchOptions.path}?${params.join('&')}`;
};

const getMethod = (fetchOptions: Readonly<HttpFetchOptionsWithPath>): string => {
  return (fetchOptions.method ?? 'GET').toUpperCase();
};

const shouldIgnore = (
  fetchOptions: Readonly<HttpFetchOptionsWithPath>,
  ignoredPrefixes: readonly string[]
): boolean => {
  const { path } = fetchOptions;
  if (!path) {
    return true;
  }
  return ignoredPrefixes.some((prefix) => path.startsWith(prefix));
};

const findLastPending = (
  bucket: TrackedRequest[],
  payloadFingerprint: string
): TrackedRequest | undefined => {
  for (let i = bucket.length - 1; i >= 0; i--) {
    const entry = bucket[i];
    if (entry.responseFingerprint === null && entry.payloadFingerprint === payloadFingerprint) {
      return entry;
    }
  }
  return undefined;
};

const countMatches = (
  bucket: readonly TrackedRequest[],
  payloadFingerprint: string,
  responseFingerprint: string
): number => {
  let count = 0;
  for (const entry of bucket) {
    if (
      entry.payloadFingerprint === payloadFingerprint &&
      entry.responseFingerprint === responseFingerprint
    ) {
      count++;
    }
  }
  return count;
};

const computeWindowSpan = (
  bucket: readonly TrackedRequest[],
  payloadFingerprint: string,
  responseFingerprint: string
): number => {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const entry of bucket) {
    if (
      entry.payloadFingerprint === payloadFingerprint &&
      entry.responseFingerprint === responseFingerprint
    ) {
      if (entry.issuedAt < min) min = entry.issuedAt;
      if (entry.issuedAt > max) max = entry.issuedAt;
    }
  }
  return max - min;
};

const fingerprintPayload = (fetchOptions: Readonly<HttpFetchOptionsWithPath>): string => {
  const query = stableStringify(fetchOptions.query);
  const body = serializeBody(fetchOptions.body);
  return `${query}::${body}`;
};

/**
 * Tier 3 explicitly skips streamed/binary payloads (Blob, ArrayBuffer, etc.) –
 * we treat them as "always unique" so they never trigger a false positive.
 */
const fingerprintResponseBody = (body: unknown): string => {
  if (body == null) return '__null__';
  if (typeof body === 'string') return `s:${body}`;
  if (typeof body === 'number' || typeof body === 'boolean') return `p:${String(body)}`;
  if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return `__binary_${Math.random()}__`;
  }
  return stableStringify(body);
};

const serializeBody = (body: unknown): string => {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return `__binary_${Math.random()}__`;
  }
  return stableStringify(body);
};

/**
 * Deterministic stringifier so `{a:1,b:2}` and `{b:2,a:1}` produce the same
 * fingerprint. Plain JSON – no circular-reference detection because Kibana
 * request payloads are already serializable.
 */
const stableStringify = (value: unknown): string => {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`;
};
