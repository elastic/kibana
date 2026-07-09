/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesResolveIndexRequest,
  IndicesResolveIndexResolveIndexItem,
  IndicesResolveIndexResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { castArray } from 'lodash';
import { getErrorMessage } from '../../../common';

// ── Types ──────────────────────────────────────────────────────────────────

/** The patterns we intend to query */
export interface EsqlFromClauseTargets {
  include: string[];
  exclude: string[];
}

/** Changes to the patterns we will query */
interface EsqlFromClauseEdit {
  include?: string[];
  exclude?: string[];
  drop?: string[];
}

/** The context each pre-flight case receives */
interface PreflightContext {
  requested: EsqlFromClauseTargets;
  resolved: IndicesResolveIndexResponse;
  esClient: ElasticsearchClient;
  logger: Logger;
}

/** A pre-flight case: edits we do to the FROM clause */
type PreflightCase = (ctx: PreflightContext) => Promise<EsqlFromClauseEdit>;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compiles targets into an ESQL-safe FROM clause, reconciled against the given cluster.
 * Locality-agnostic: callers pass their own patterns and their own client (the local extractor
 * against the local cluster, the remote extractor against the remote one).
 */
export const resolveEsqlFromClause = async (
  esClient: ElasticsearchClient,
  targets: EsqlFromClauseTargets,
  logger: Logger
): Promise<string[]> => toEsqlFromClause(await reconcile(esClient, targets, logger));

// ── Reconciliation: resolve against the cluster, run each case, fold the edits ──

/** Rewrites the targets so ESQL's FROM can safely execute; falls back to the raw targets on failure. */
const reconcile = async (
  esClient: ElasticsearchClient,
  requested: EsqlFromClauseTargets,
  logger: Logger
): Promise<EsqlFromClauseTargets> => {
  if (requested.include.length === 0) return requested;

  try {
    const resolved = await esClient.indices.resolveIndex(resolveIndexRequest(requested.include));
    const ctx: PreflightContext = { requested, resolved, esClient, logger };
    const edits = await Promise.all(PREFLIGHT_CASES.map((runCase) => runCase(ctx)));
    return edits.reduce(applyEdit, requested);
  } catch (error) {
    logger.warn(
      `Failed to reconcile index patterns (querying them unfiltered): ${getErrorMessage(error)}`
    );
    return requested;
  }
};

/** Applies one edit: dropped names vanish from both lists; includes/excludes are appended. */
const applyEdit = (
  { include, exclude }: EsqlFromClauseTargets,
  edit: EsqlFromClauseEdit
): EsqlFromClauseTargets => {
  const dropped = new Set(edit.drop);
  const keep = (patterns: string[]) => patterns.filter((p) => !dropped.has(p));
  return {
    include: [...keep(include), ...(edit.include ?? [])],
    exclude: [...keep(exclude), ...(edit.exclude ?? [])],
  };
};

// ── Pre-flight cases ───────────────────────────────────────────────────────

/** A concrete name that doesn't exist makes FROM throw, and can't be negated either — so drop it. */
const dropMissingConcreteIndices: PreflightCase = async ({ requested, resolved, logger }) => {
  const existing = new Set<string>([
    ...resolved.indices.map((i) => i.name),
    ...resolved.data_streams.map((d) => d.name),
    ...resolved.aliases.map((a) => a.name),
  ]);
  const missing = (patterns: string[]) => patterns.filter((p) => isConcrete(p) && !existing.has(p));

  const missingIncludes = missing(requested.include);
  const missingExcludes = missing(requested.exclude);
  if (missingIncludes.length) {
    logger.warn(`Dropping index patterns that don't exist: ${missingIncludes.join(', ')}`);
  }

  return {
    drop: [...missingIncludes, ...missingExcludes],
  };
};

/** A data stream with a closed backing index can't be read — exclude it, read its open backing indices instead. */
const rerouteClosedDataStreams: PreflightCase = async ({ resolved, esClient, logger }) => {
  const streams = resolved.data_streams.map((ds) => ({
    name: ds.name,
    backing: castArray(ds.backing_indices),
  }));

  // resolveIndex reports backing indices by name only, so a second call learns their open/closed state.
  const findClosed = async (names: string[]): Promise<Set<string>> => {
    if (names.length === 0) return new Set();
    const { indices } = await esClient.indices.resolveIndex(resolveIndexRequest(names));
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
  return {
    exclude: affected.map((d) => d.name),
    include: affected.flatMap((d) => d.openBacking),
  };
};

/** A closed standalone index can't be read — exclude it by name. */
const excludeClosedStandaloneIndices: PreflightCase = async ({ resolved, logger }) => {
  const closed = resolved.indices.filter((i) => !i.data_stream && isClosed(i)).map((i) => i.name);
  if (closed.length) logger.warn(`Excluding closed indices from query: ${closed.join(', ')}`);
  return { exclude: closed };
};

// Order-independent: cases derive edits from the shared ctx, not the accumulating targets.
const PREFLIGHT_CASES: PreflightCase[] = [
  dropMissingConcreteIndices,
  rerouteClosedDataStreams,
  excludeClosedStandaloneIndices,
];

// ── Rendering & low-level helpers ──────────────────────────────────────────

/** Renders the final ESQL FROM clause array */
const toEsqlFromClause = ({ include, exclude }: EsqlFromClauseTargets): string[] => {
  const excluded = new Set(exclude);
  const positives = include.filter((name) => !excluded.has(name));
  // No positives means nothing to read — a FROM of only negations is invalid.
  return positives.length === 0 ? [] : [...positives, ...exclude.map(negate)];
};

/** Builds the `indices.resolveIndex` request, matching open, closed, and hidden indices */
const resolveIndexRequest = (name: string[]): IndicesResolveIndexRequest => ({
  name,
  expand_wildcards: ['open', 'closed', 'hidden'],
  ignore_unavailable: true,
  allow_no_indices: true,
});

const negate = (name: string): string => `-${name}`;
const isConcrete = (pattern: string): boolean => !pattern.includes('*');
const isClosed = (index: IndicesResolveIndexResolveIndexItem): boolean =>
  index.attributes.includes('closed');
