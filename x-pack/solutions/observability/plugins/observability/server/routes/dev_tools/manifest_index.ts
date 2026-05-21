/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs, type Dirent } from 'fs';
import Path from 'path';
import type { Logger } from '@kbn/core/server';

/**
 * Per-plugin ownership record derived from a single `kibana.jsonc` manifest.
 * Both fields are required for prefix matching: `dir` (repo-relative,
 * forward-slash separated) is the search key for "given a file path, which
 * plugin does it belong to?"; `owners` is the answer the consumer cares about.
 */
export interface ManifestEntry {
  /** Repo-relative directory containing the plugin's `kibana.jsonc`. */
  dir: string;
  /** Runtime plugin ID (`manifest.plugin.id`) – may be missing for some packages. */
  pluginId?: string;
  /** GitHub team handles ("@elastic/...") that own the plugin. Always at least 1 entry. */
  owners: string[];
}

export interface ManifestIndex {
  /** All plugin entries with at least one owner, sorted longest-`dir`-first for prefix matching. */
  entries: ManifestEntry[];
  /** ISO timestamp the index was built – exposed so downstream responses can include it. */
  builtAt: string;
}

/**
 * Directories whose subtrees never contain plugins and can be skipped
 * wholesale during the recursive scan. Skipping them turns a multi-second
 * walk over the entire Kibana repo into a sub-second scan.
 */
const EXCLUDED_DIR_NAMES = new Set([
  '.git',
  '.cache',
  '.cursor',
  '.codex',
  '.devcontainer',
  '.husky',
  '.idea',
  '.vscode',
  '.yarn',
  'build',
  'bazel-out',
  'coverage',
  'data',
  'dist',
  'docs',
  'node_modules',
  'target',
  'tmp',
  '.es',
  '.chromium',
  '.scout',
]);

let cached: { root: string; index: ManifestIndex } | null = null;

const stripJsoncComments = (input: string): string =>
  input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/.*$/gm, (_match, prefix) => prefix);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
};

interface ParsedManifest {
  type?: string;
  owner?: unknown;
  plugin?: { id?: unknown };
}

const collectManifestPaths = async (root: string): Promise<string[]> => {
  const results: string[] = [];
  const visit = async (dir: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = (await Fs.readdir(dir, { withFileTypes: true })) as Dirent[];
    } catch {
      return;
    }
    const subdirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
        subdirs.push(Path.join(dir, entry.name));
        continue;
      }
      if (entry.isFile() && entry.name === 'kibana.jsonc') {
        results.push(Path.join(dir, entry.name));
      }
    }
    // Fan out subdirectories in parallel — `readdir` is the bottleneck and
    // the fan-out is bounded by the small EXCLUDED_DIR_NAMES set above.
    await Promise.all(subdirs.map(visit));
  };
  await visit(root);
  return results;
};

/**
 * Walk the repo from `root`, parse every `kibana.jsonc`, and return a list of
 * ownership entries. Cached after the first call for the lifetime of the
 * server process. Pass `root` so the cache key is correct under test (where
 * REPO_ROOT may be a temp directory).
 */
export const getManifestIndex = async (root: string, logger: Logger): Promise<ManifestIndex> => {
  if (cached && cached.root === root) {
    return cached.index;
  }
  const manifestPaths = await collectManifestPaths(root);
  const entries: ManifestEntry[] = [];

  await Promise.all(
    manifestPaths.map(async (manifestPath) => {
      try {
        const raw = await Fs.readFile(manifestPath, 'utf8');
        const parsed = JSON.parse(stripJsoncComments(raw)) as ParsedManifest;
        if (parsed.type !== 'plugin') return;
        const owners = asStringArray(parsed.owner);
        if (owners.length === 0) return;
        const dir = Path.relative(root, Path.dirname(manifestPath)).split(Path.sep).join('/');
        const pluginId = typeof parsed.plugin?.id === 'string' ? parsed.plugin.id : undefined;
        entries.push({ dir, pluginId, owners });
      } catch (err) {
        logger.debug(
          `manifest_index: failed to parse ${manifestPath}: ${(err as Error).message ?? err}`
        );
      }
    })
  );

  // Sort longest-first so consumers can stop at the first prefix match.
  entries.sort((a, b) => b.dir.length - a.dir.length);

  const index: ManifestIndex = {
    entries,
    builtAt: new Date().toISOString(),
  };
  cached = { root, index };
  return index;
};

/**
 * Given a repo-relative file path (forward-slash separated, no leading `./`),
 * return the entry whose `dir` is the longest prefix of the path – the
 * "deepest owning plugin". Returns `undefined` if no plugin owns this path
 * (e.g. files outside any plugin tree).
 */
export const findOwnerForPath = (
  index: ManifestIndex,
  repoRelPath: string
): ManifestEntry | undefined => {
  for (const entry of index.entries) {
    if (repoRelPath === entry.dir || repoRelPath.startsWith(`${entry.dir}/`)) {
      return entry;
    }
  }
  return undefined;
};

/** Test-only: drop the module-level cache between cases. */
export const __resetManifestIndexCacheForTests = (): void => {
  cached = null;
};
