/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { partition } from 'lodash';

/** The patterns we intend to query. */
export interface IndexSelection {
  include: string[];
  exclude: string[];
}

/** What those patterns actually resolve to in the cluster. */
interface ResolvedIndices {
  existing: ReadonlySet<string>;
  closedStandaloneIndices: string[];
  closedDataStreams: Array<{ name: string; openBackingIndices: string[] }>;
}

/** A pre-flight edit — the only three moves a FROM clause allows. */
interface SelectionEdit {
  include?: string[]; // add as positives — read these too
  exclude?: string[]; // add as negations (`-name`) — subtract these; the name must resolve
  drop?: string[]; // remove entirely — for names that must not appear in FROM at all
}

/** Given what was requested and what resolved, decide how to rewrite the selection. */
type PreflightCase = (requested: IndexSelection, resolved: ResolvedIndices) => SelectionEdit;

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

// --- pre-flight cases: each names the ESQL rule it works around, then the edit it makes ---

/** A concrete name that doesn't exist makes FROM throw, and can't be negated either — so drop it. */
const dropMissingConcreteIndices: PreflightCase = ({ include, exclude }, { existing }) => ({
  drop: [...include, ...exclude].filter((p) => isConcrete(p) && !existing.has(p)),
});

/** A data stream with a closed backing index can't be read — exclude it, read its open backing indices instead. */
const rerouteClosedDataStreams: PreflightCase = (_requested, { closedDataStreams }) => ({
  exclude: closedDataStreams.map((ds) => ds.name),
  include: closedDataStreams.flatMap((ds) => ds.openBackingIndices),
});

/** A closed standalone index can't be read — exclude it by name. */
const excludeClosedStandaloneIndices: PreflightCase = (
  _requested,
  { closedStandaloneIndices }
) => ({
  exclude: closedStandaloneIndices,
});

const PREFLIGHT_CASES: PreflightCase[] = [
  dropMissingConcreteIndices,
  rerouteClosedDataStreams,
  excludeClosedStandaloneIndices,
];

/** resolveIndex reports backing indices by name only (no state); a second call learns their state. */
const closedBackingNames = async (
  esClient: ElasticsearchClient,
  backingIndices: string[]
): Promise<ReadonlySet<string>> => {
  if (backingIndices.length === 0) return new Set();
  const { indices } = await esClient.indices.resolveIndex(resolveArgs(backingIndices));
  return new Set(indices.filter(isClosed).map((i) => i.name));
};

const resolveIndices = async (
  esClient: ElasticsearchClient,
  patterns: string[]
): Promise<ResolvedIndices> => {
  const {
    indices,
    aliases,
    data_streams: dataStreams,
  } = await esClient.indices.resolveIndex(resolveArgs(patterns));

  const closedBacking = await closedBackingNames(
    esClient,
    dataStreams.flatMap((ds) => asArray(ds.backing_indices))
  );

  return {
    existing: new Set([
      ...indices.map((i) => i.name),
      ...dataStreams.map((ds) => ds.name),
      ...aliases.map((a) => a.name),
    ]),
    // Backing indices are excluded here — they're handled via their parent data stream below.
    closedStandaloneIndices: indices
      .filter((i) => !i.data_stream && isClosed(i))
      .map((i) => i.name),
    closedDataStreams: dataStreams
      .map((ds) => ({ name: ds.name, backing: asArray(ds.backing_indices) }))
      .filter((ds) => ds.backing.some((b) => closedBacking.has(b)))
      .map((ds) => ({
        name: ds.name,
        openBackingIndices: ds.backing.filter((b) => !closedBacking.has(b)),
      })),
  };
};

const logAnomalies = (
  logger: Logger,
  requested: IndexSelection,
  resolved: ResolvedIndices
): void => {
  // Only missing includes matter — a missing exclusion is a silent no-op, not worth reporting.
  const missing = requested.include.filter((p) => isConcrete(p) && !resolved.existing.has(p));
  const closed = [
    ...resolved.closedStandaloneIndices,
    ...resolved.closedDataStreams.map((ds) => ds.name),
  ];
  if (missing.length)
    logger.warn(`Dropping index patterns that don't exist: ${missing.join(', ')}`);
  if (closed.length) logger.warn(`Excluding closed indices from query: ${closed.join(', ')}`);
};

/** Rewrites a selection so ESQL's FROM can safely execute it; falls back to the raw selection on failure. */
const harden = async (
  esClient: ElasticsearchClient,
  requested: IndexSelection,
  logger: Logger
): Promise<IndexSelection> => {
  if (requested.include.length === 0) return requested;

  let resolved: ResolvedIndices;
  try {
    resolved = await resolveIndices(esClient, requested.include);
  } catch (error) {
    logger.warn(`Failed to resolve index patterns (querying them unfiltered): ${message(error)}`);
    return requested;
  }

  logAnomalies(logger, requested, resolved);
  return PREFLIGHT_CASES.reduce(
    (current, runCase) => applyEdit(current, runCase(current, resolved)),
    requested
  );
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
