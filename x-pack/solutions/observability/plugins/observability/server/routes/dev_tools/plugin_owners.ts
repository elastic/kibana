/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  __resetManifestIndexCacheForTests,
  getManifestIndex,
  type ManifestIndex,
} from './manifest_index';

export interface PluginOwnersResponse {
  /** Map of runtime plugin ID -> GitHub team handles ("@elastic/...") that own it. */
  owners: Record<string, string[]>;
  /** Sorted unique list of all team handles that own at least one plugin. */
  knownTeams: string[];
  /** ISO timestamp of when this map was first computed. */
  builtAt: string;
}

/**
 * Powers dev-mode UIs that scope developer signals to "plugins owned by my
 * teams" — currently the duplicate request detector in `observability_shared`,
 * but designed to be usable by any future dev-mode surface that wants to
 * filter by GitHub-team ownership.
 *
 * IMPORTANT: This route is only registered when Kibana is running in dev mode
 * (`env.mode.dev === true`). In production builds the route does not exist;
 * callers receive a 404 and should treat that as "no team filtering available".
 */
const ROUTE_PATH = '/internal/observability/dev_tools/plugin_owners' as const;

let cached: PluginOwnersResponse | null = null;

const buildOwnersMap = (index: ManifestIndex): PluginOwnersResponse => {
  const owners: Record<string, string[]> = {};
  const teams = new Set<string>();
  for (const entry of index.entries) {
    if (!entry.pluginId) continue;
    owners[entry.pluginId] = entry.owners;
    for (const team of entry.owners) teams.add(team);
  }
  return {
    owners,
    knownTeams: [...teams].sort(),
    builtAt: index.builtAt,
  };
};

export const registerPluginOwnersRoute = (router: IRouter, logger: Logger): void => {
  router.get(
    {
      path: ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            'Dev-mode-only endpoint that returns the pluginId-to-GitHub-team map already published in .github/CODEOWNERS and each plugin kibana.jsonc; contains no user, security, or runtime data.',
        },
      },
      options: { access: 'internal' },
      validate: false,
    },
    async (_ctx, _req, res) => {
      if (!cached) {
        try {
          const index = await getManifestIndex(REPO_ROOT, logger);
          cached = buildOwnersMap(index);
          logger.debug(
            `plugin_owners: built map with ${Object.keys(cached.owners).length} plugins / ${
              cached.knownTeams.length
            } teams`
          );
        } catch (err) {
          logger.warn(
            `plugin_owners: failed to build map (${
              (err as Error).message ?? err
            }); responding with empty map`
          );
          return res.ok({
            body: { owners: {}, knownTeams: [], builtAt: new Date().toISOString() },
          });
        }
      }
      return res.ok({ body: cached });
    }
  );
};

/**
 * Test-only: clear both the local response cache and the shared manifest
 * index so each test sees a fresh scan.
 */
export const __resetPluginOwnersCacheForTests = (): void => {
  cached = null;
  __resetManifestIndexCacheForTests();
};

export const PLUGIN_OWNERS_ROUTE_PATH = ROUTE_PATH;
