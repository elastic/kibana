/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { partition } from 'lodash';

/** The patterns we intend to query. */
export interface IndexSelection {
  include: string[];
  exclude: string[];
}

/** A pre-flight edit — the only three moves a FROM clause allows. */
interface SelectionEdit {
  include?: string[]; // add as positives — read these too
  exclude?: string[]; // add as negations (`-name`) — subtract these; the name must resolve
  drop?: string[]; // remove entirely — for names that must not appear in FROM at all
}

/** What every pre-flight case is handed: the request, the shared resolve of it, and the tools to do more. */
interface PreflightContext {
  requested: IndexSelection;
  resolved: IndicesResolveIndexResponse;
  esClient: ElasticsearchClient;
  logger: Logger;
}

/** A pre-flight case: set up the facts it needs (async), then return its edit. */
type PreflightCase = (ctx: PreflightContext) => Promise<SelectionEdit>;

const negate = (name: string): string => `-${name}`;
const isConcrete = (pattern: string): boolean => !pattern.includes('*');
const isClosed = (index: { attributes: string[] }): boolean => index.attributes.includes('closed');
const asArray = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]);
const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveArgs = (name: string[]) => ({
  name,
  expand_wildcards: ['open', 'closed', 'hidden'] as Array<'open' | 'closed' | 'hidden'>,
  ignore_unavailable: true,
  allow_no_indices: true,
});

/**
 * Renders a selection into an ESQL FROM list. The sole owner of the "negations go last" rule.
 * An excluded name is never also listed as a positive — the negation alone expresses the intent.
 */
const renderFrom = ({ include, exclude }: IndexSelection): string[] => {
  const excluded = new Set(exclude);
  return [...include.filter((name) => !excluded.has(name)), ...exclude.map(negate)];
};

/** Applies one edit: dropped names vanish from both lists; includes/excludes are appended. */
const applyEdit = ({ include, exclude }: IndexSelection, edit: SelectionEdit): IndexSelection => {
  const dropped = new Set(edit.drop);
  const keep = (patterns: string[]) => patterns.filter((p) => !dropped.has(p));
  return {
    include: [...keep(include), ...(edit.include ?? [])],
    exclude: [...keep(exclude), ...(edit.exclude ?? [])],
  };
};

// --- pre-flight cases: each sets up the facts it needs, then returns the edit it makes ---

/** A concrete name that doesn't exist makes FROM throw, and can't be negated either — so drop it. */
const dropMissingConcreteIndices: PreflightCase = async ({ requested, resolved, logger }) => {
  const existing = new Set<string>([
    ...resolved.indices.map((i) => i.name),
    ...resolved.data_streams.map((d) => d.name),
    ...resolved.aliases.map((a) => a.name),
  ]);
  const missing = (patterns: string[]) => patterns.filter((p) => isConcrete(p) && !existing.has(p));

  const absentIncludes = missing(requested.include);
  if (absentIncludes.length) {
    logger.warn(`Dropping index patterns that don't exist: ${absentIncludes.join(', ')}`);
  }
  // Missing exclusions are dropped too — negating a non-existent name is a no-op.
  return { drop: [...absentIncludes, ...missing(requested.exclude)] };
};

/** A data stream with a closed backing index can't be read — exclude it, read its open backing indices instead. */
const rerouteClosedDataStreams: PreflightCase = async ({ resolved, esClient, logger }) => {
  const streams = resolved.data_streams.map((ds) => ({
    name: ds.name,
    backing: asArray(ds.backing_indices),
  }));

  // resolveIndex reports backing indices by name only, so a second call learns their open/closed state.
  const findClosed = async (names: string[]): Promise<Set<string>> => {
    if (names.length === 0) return new Set();
    const { indices } = await esClient.indices.resolveIndex(resolveArgs(names));
    return new Set(indices.filter(isClosed).map((i) => i.name));
  };
  const closedBacking = await findClosed(streams.flatMap((ds) => ds.backing));

  const affected = streams
    .filter((ds) => ds.backing.some((b) => closedBacking.has(b)))
    .map((ds) => ({ name: ds.name, openBacking: ds.backing.filter((b) => !closedBacking.has(b)) }));

  if (affected.length) {
    logger.warn(
      `Rerouting data streams with closed backing indices: ${affected
        .map((d) => d.name)
        .join(', ')}`
    );
  }
  return { exclude: affected.map((d) => d.name), include: affected.flatMap((d) => d.openBacking) };
};

/** A closed standalone index can't be read — exclude it by name. */
const excludeClosedStandaloneIndices: PreflightCase = async ({ resolved, logger }) => {
  const closed = resolved.indices.filter((i) => !i.data_stream && isClosed(i)).map((i) => i.name);
  if (closed.length) logger.warn(`Excluding closed indices from query: ${closed.join(', ')}`);
  return { exclude: closed };
};

const PREFLIGHT_CASES: PreflightCase[] = [
  dropMissingConcreteIndices,
  rerouteClosedDataStreams,
  excludeClosedStandaloneIndices,
];

/** Rewrites a selection so ESQL's FROM can safely execute it; falls back to the raw selection on failure. */
const harden = async (
  esClient: ElasticsearchClient,
  requested: IndexSelection,
  logger: Logger
): Promise<IndexSelection> => {
  if (requested.include.length === 0) return requested;

  let resolved: IndicesResolveIndexResponse;
  try {
    resolved = await esClient.indices.resolveIndex(resolveArgs(requested.include));
  } catch (error) {
    logger.warn(`Failed to resolve index patterns (querying them unfiltered): ${message(error)}`);
    return requested;
  }

  const ctx: PreflightContext = { requested, resolved, esClient, logger };
  const edits = await Promise.all(PREFLIGHT_CASES.map((runCase) => runCase(ctx)));
  return edits.reduce(applyEdit, requested);
};

const splitByLocality = ({ include, exclude }: IndexSelection) => {
  const [remoteInclude, localInclude] = partition(include, isNonLocalIndexName);
  const [remoteExclude, localExclude] = partition(exclude, isNonLocalIndexName);
  return {
    local: { include: localInclude, exclude: localExclude },
    remote: { include: remoteInclude, exclude: remoteExclude },
  };
};

/**
 * Compiles a selection into ESQL-safe local and remote FROM lists. Only local patterns are hardened
 * against this cluster — remote patterns run on another cluster and are hardened there (see `resolveFrom`).
 */
export const resolveLocalAndRemoteFrom = async (
  esClient: ElasticsearchClient,
  selection: IndexSelection,
  logger: Logger
): Promise<{ local: string[]; remote: string[] }> => {
  const { local, remote } = splitByLocality(selection);
  return { local: renderFrom(await harden(esClient, local, logger)), remote: renderFrom(remote) };
};

/** Compiles a flat include list into an ESQL-safe FROM list, hardened against the given cluster. */
export const resolveFrom = async (
  esClient: ElasticsearchClient,
  include: string[],
  logger: Logger
): Promise<string[]> => renderFrom(await harden(esClient, { include, exclude: [] }, logger));
