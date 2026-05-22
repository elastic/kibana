/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';

/**
 * Shape of the response returned by
 * `/internal/observability/dev_tools/plugin_owners`. Lives on the client side
 * to keep `observability_shared` from taking a hard dependency on the
 * `observability` server bundle — we just pin the URL + the response shape.
 */
export interface PluginOwnersSnapshot {
  /** pluginId -> GitHub team handles ("@elastic/...") that own the plugin. */
  owners: Record<string, string[]>;
  /** Sorted unique list of team handles, suitable for an autocomplete dropdown. */
  knownTeams: string[];
}

/**
 * Server-detected suggestion of which teams the current developer most likely
 * belongs to, derived from their git history + plugin manifest ownership.
 * See `routes/dev_tools/my_teams.ts` in `observability/server` for details.
 */
export interface MyTeamsResult {
  detectedEmail?: string;
  suggestedTeams: Array<{ team: string; evidenceCount: number }>;
  matchedFileCount: number;
  scannedFileCount: number;
  detectedAt: string;
}

/** Paths on the `observability` server plugin. Hardcoded to keep the dependency one-way. */
const PLUGIN_OWNERS_PATH = '/internal/observability/dev_tools/plugin_owners' as const;
const MY_TEAMS_PATH = '/internal/observability/dev_tools/my_teams' as const;

const EMPTY_SNAPSHOT: PluginOwnersSnapshot = { owners: {}, knownTeams: [] };

/**
 * Cross-bundle-safe singleton (Kibana plugins ship as separate bundles, so a
 * plain module-level variable would not be shared between, say, the SLO and
 * Synthetics public bundles).
 */
const SINGLETON_KEY: unique symbol = Symbol.for('kbn.observabilityShared.duplicateDetectorOwners');

class PluginOwnersStore {
  /**
   * Latest snapshot pushed to subscribers. Starts empty so the settings UI can
   * render immediately without waiting on the network round-trip.
   */
  readonly snapshot$: BehaviorSubject<PluginOwnersSnapshot> =
    new BehaviorSubject<PluginOwnersSnapshot>(EMPTY_SNAPSHOT);

  /**
   * In-flight fetch promise. Multiple calls to {@link ensureLoaded} during the
   * same boot will all await the same request rather than hammering the route.
   */
  private inflight: Promise<void> | null = null;

  /**
   * Fetch the owners map (once) and publish it on {@link snapshot$}. Safe to
   * call from every plugin's detector startup — only the first call actually
   * hits the network. Resolves to a no-op snapshot if the route is unavailable
   * (e.g. running outside the observability solution).
   */
  ensureLoaded(http: HttpStart): Promise<void> {
    if (this.snapshot$.getValue().knownTeams.length > 0) {
      return Promise.resolve();
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = http
      .fetch<PluginOwnersSnapshot>(PLUGIN_OWNERS_PATH, { method: 'GET' })
      .then((body) => {
        this.snapshot$.next(sanitize(body));
      })
      .catch(() => {
        // 404 is the normal case in production / non-observability contexts;
        // swallow and leave the snapshot empty so team-scoping silently no-ops.
        this.snapshot$.next(EMPTY_SNAPSHOT);
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** Synchronous read of the current snapshot. */
  get(): PluginOwnersSnapshot {
    return this.snapshot$.getValue();
  }

  /**
   * Ask the server which teams the current developer most likely belongs to,
   * based on their `git config user.email` + commit history in this checkout.
   *
   * Always returns a structured result — failures resolve to an empty
   * suggestion list so the UI never has to handle thrown errors. Subsequent
   * calls always hit the server (the server-side response is cached, so this
   * is cheap; we don't want a stale client-side cache to mask a fresh
   * detection after the user switches branches or amends their git config).
   */
  async detectMyTeams(http: HttpStart): Promise<MyTeamsResult> {
    try {
      const body = await http.fetch<MyTeamsResult>(MY_TEAMS_PATH, { method: 'GET' });
      return sanitizeMyTeams(body);
    } catch {
      return EMPTY_MY_TEAMS;
    }
  }
}

const EMPTY_MY_TEAMS: MyTeamsResult = {
  suggestedTeams: [],
  matchedFileCount: 0,
  scannedFileCount: 0,
  detectedAt: new Date(0).toISOString(),
};

const sanitizeMyTeams = (input: unknown): MyTeamsResult => {
  if (!input || typeof input !== 'object') return EMPTY_MY_TEAMS;
  const value = input as Partial<MyTeamsResult>;
  const suggestedTeams = Array.isArray(value.suggestedTeams)
    ? value.suggestedTeams
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const team = (row as { team?: unknown }).team;
          const evidenceCount = (row as { evidenceCount?: unknown }).evidenceCount;
          if (typeof team !== 'string' || team.length === 0) return null;
          if (typeof evidenceCount !== 'number' || !Number.isFinite(evidenceCount)) return null;
          return { team, evidenceCount };
        })
        .filter((row): row is { team: string; evidenceCount: number } => row !== null)
    : [];
  return {
    detectedEmail: typeof value.detectedEmail === 'string' ? value.detectedEmail : undefined,
    suggestedTeams,
    matchedFileCount:
      typeof value.matchedFileCount === 'number' && Number.isFinite(value.matchedFileCount)
        ? value.matchedFileCount
        : 0,
    scannedFileCount:
      typeof value.scannedFileCount === 'number' && Number.isFinite(value.scannedFileCount)
        ? value.scannedFileCount
        : 0,
    detectedAt: typeof value.detectedAt === 'string' ? value.detectedAt : new Date().toISOString(),
  };
};

interface GlobalWithOwners {
  [SINGLETON_KEY]?: PluginOwnersStore;
}

const sanitize = (input: unknown): PluginOwnersSnapshot => {
  if (!input || typeof input !== 'object') return EMPTY_SNAPSHOT;
  const { owners, knownTeams } = input as Partial<PluginOwnersSnapshot>;
  const safeOwners: Record<string, string[]> = {};
  if (owners && typeof owners === 'object') {
    for (const [pluginId, value] of Object.entries(owners)) {
      if (!Array.isArray(value)) continue;
      const teams = value.filter((t): t is string => typeof t === 'string' && t.length > 0);
      if (teams.length > 0) safeOwners[pluginId] = teams;
    }
  }
  const safeTeams = Array.isArray(knownTeams)
    ? knownTeams.filter((t): t is string => typeof t === 'string' && t.length > 0)
    : [];
  return { owners: safeOwners, knownTeams: safeTeams };
};

export const getPluginOwnersStore = (): PluginOwnersStore => {
  const g = globalThis as unknown as GlobalWithOwners;
  if (!g[SINGLETON_KEY]) {
    g[SINGLETON_KEY] = new PluginOwnersStore();
  }
  return g[SINGLETON_KEY]!;
};

/** Test-only: drop the singleton so the next access gets a clean store. */
export const __resetPluginOwnersStoreForTests = (): void => {
  const g = globalThis as unknown as GlobalWithOwners;
  delete g[SINGLETON_KEY];
};

export const __PLUGIN_OWNERS_PATH = PLUGIN_OWNERS_PATH;
export const __MY_TEAMS_PATH = MY_TEAMS_PATH;
