/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type { IndexMode, QueryPlan, ResolvedIndex } from '../generator';
import { toSourceError } from './errors/source_error';

/** Why a pattern gives the planner no indices. */
export type UnusableSourceCause =
  | 'no_matching_index'
  | 'not_readable'
  | 'settings_failed'
  | 'privilege_check_failed';

/** The readable concrete indices behind a pattern, each with its index mode. */
export interface UsableSourceIndices {
  usable: true;
  indices: ResolvedIndex[];
}

/** A pattern the planner cannot use, with a reason fit for `errors[]`. */
export interface UnusableSourceIndices {
  usable: false;
  cause: UnusableSourceCause;
  /** The HTTP status Elasticsearch answered with; null when no request failed or there was no response. */
  status: number | null;
  reason: string;
}

/** What `resolveSourceIndices` found behind one pattern. */
export type SourceIndicesResult = UsableSourceIndices | UnusableSourceIndices;

/** Options of `resolveSourceIndices`. */
export interface ResolveSourceIndicesOptions {
  /** False when security is off, so no privilege check is possible or needed. */
  checkReadability: boolean;
}

/** Concrete index name to the requested fields it maps. */
export type MappedFieldsByIndex = ReadonlyMap<string, ReadonlySet<string>>;

/** One source's request for field availability: its resolved concrete indices and the fields its plans reference. */
export interface FieldAvailabilityRequest {
  indexPattern: string;
  indices: string[];
  fields: string[];
}

/** The mapped fields of a pattern's indices, or why field capabilities failed for it. */
export type FieldAvailabilityResult =
  | { failed: false; mappedByIndex: MappedFieldsByIndex }
  | { failed: true; status: number | null; reason: string };

/** Whether a plan can run, and which of its attribute fields no index maps. */
export interface PlanAvailability {
  usable: boolean;
  reason?: string;
  unavailableFields: string[];
}

interface ConcreteIndex {
  name: string;
  mode: IndexMode;
  dataStream?: string;
}

type Readability = { failed: false; readable: Set<string> } | { failed: true; error: unknown };

const FAILURE_STORE_PREFIX = '.fs-';

const unusable = (
  cause: UnusableSourceCause,
  reason: string,
  status: number | null = null
): UnusableSourceIndices => ({ usable: false, cause, status, reason });

// An index without an explicit mode only appears under `defaults`; `logsdb` and the rest are not
// time series, so `TS` would drop their rows.
const modeOf = ({ settings, defaults }: IndicesIndexState): IndexMode =>
  (settings?.index?.mode ?? defaults?.index?.mode) === 'time_series' ? 'time_series' : 'standard';

// Get index rather than get settings: the same metadata privilege, but it also names the data
// stream a backing index belongs to, which the readability check needs.
const loadConcreteIndices = async (
  client: ElasticsearchClient,
  pattern: string
): Promise<ConcreteIndex[]> => {
  const response = await client.indices.get({
    index: pattern,
    features: ['settings'],
    include_defaults: true,
    ignore_unavailable: true,
    allow_no_indices: true,
    expand_wildcards: ['open', 'hidden'],
    filter_path: ['*.settings.index.mode', '*.defaults.index.mode', '*.data_stream'],
  });
  return Object.entries(response)
    .map(([name, state]) => ({
      name,
      mode: modeOf(state),
      ...(state.data_stream !== undefined ? { dataStream: state.data_stream } : {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
};

// `_has_privileges` matches names literally, so a role granted on a data stream answers false for
// its backing indices although searches reach them; the stream's privilege is checked too, and a
// failure store index is readable only through `read_failure_store` on its stream.
const readableIndices = async (
  client: ElasticsearchClient,
  indices: ConcreteIndex[]
): Promise<Set<string>> => {
  const names = [
    ...new Set(
      indices.flatMap(({ name, dataStream }) => (dataStream ? [name, dataStream] : [name]))
    ),
  ].sort();
  if (names.length === 0) {
    return new Set();
  }
  const { index } = await client.security.hasPrivileges({
    index: [{ names, privileges: ['read', 'read_failure_store'] }],
  });
  return new Set(
    indices
      .filter(({ name, dataStream }) => {
        if (name.startsWith(FAILURE_STORE_PREFIX)) {
          return dataStream !== undefined && index[dataStream]?.read_failure_store === true;
        }
        return (
          index[name]?.read === true ||
          (dataStream !== undefined && index[dataStream]?.read === true)
        );
      })
      .map(({ name }) => name)
  );
};

/**
 * Resolves each pattern to its readable concrete indices and their modes, or to the reason it is
 * unusable; duplicate patterns resolve once. If the privilege check fails, every pattern that
 * resolved to indices is unusable with cause `privilege_check_failed`.
 */
export const resolveSourceIndices = async (
  client: ElasticsearchClient,
  patterns: string[],
  { checkReadability }: ResolveSourceIndicesOptions
): Promise<Map<string, SourceIndicesResult>> => {
  const unique = [...new Set(patterns)];
  const settled = await Promise.allSettled(
    unique.map((pattern) => loadConcreteIndices(client, pattern))
  );
  const resolved = settled.flatMap((outcome) =>
    outcome.status === 'fulfilled' ? outcome.value : []
  );
  const readability = checkReadability
    ? await readableIndices(client, resolved).then(
        (readable): Readability => ({ failed: false, readable }),
        (error: unknown): Readability => ({ failed: true, error })
      )
    : undefined;

  return new Map(
    unique.map((pattern, position): [string, SourceIndicesResult] => {
      const outcome = settled[position];
      if (outcome.status === 'rejected') {
        const { status, reason } = toSourceError(pattern, outcome.reason);
        return [
          pattern,
          unusable('settings_failed', `index settings request failed: ${reason}`, status),
        ];
      }
      const all = outcome.value;
      if (all.length === 0) {
        return [pattern, unusable('no_matching_index', `"${pattern}" matches no index`)];
      }
      if (readability?.failed) {
        const { status, reason } = toSourceError(pattern, readability.error);
        return [
          pattern,
          unusable('privilege_check_failed', `privilege check failed: ${reason}`, status),
        ];
      }
      const indices = readability ? all.filter(({ name }) => readability.readable.has(name)) : all;
      if (indices.length === 0) {
        return [
          pattern,
          unusable('not_readable', `the current user cannot read any index behind "${pattern}"`),
        ];
      }
      return [
        pattern,
        { usable: true, indices: indices.map(({ name, mode }) => ({ name, mode })) },
      ];
    })
  );
};

const sortedUnion = (lists: string[][]): string[] => [...new Set(lists.flat())].sort();

const asList = (names: string | string[]): string[] => (Array.isArray(names) ? names : [names]);

// Asks by pattern, not by concrete index: the client puts the index list in the URL, and a pattern
// that resolves to many indices exceeds the HTTP line limit. The client sends `fields` in the body.
const loadMappedFields = async (
  client: ElasticsearchClient,
  patterns: string[],
  fields: string[]
): Promise<Map<string, Set<string>>> => {
  const mapped = new Map<string, Set<string>>();
  const response = await client.fieldCaps({
    index: patterns,
    fields,
    include_unmapped: true,
    ignore_unavailable: true,
    allow_no_indices: true,
    expand_wildcards: ['open', 'hidden'],
    filters: '-metadata',
  });
  const answered = asList(response.indices);
  Object.entries(response.fields).forEach(([field, byType]) => {
    const unmapped = new Set(asList(byType.unmapped?.indices ?? []));
    Object.entries(byType).forEach(([type, capability]) => {
      if (type === 'unmapped') {
        return;
      }
      // A type entry without `indices` holds for every index the call answered for.
      asList(capability.indices ?? answered).forEach((name) => {
        if (unmapped.has(name)) {
          return;
        }
        const known = mapped.get(name) ?? new Set<string>();
        known.add(field);
        mapped.set(name, known);
      });
    });
  });
  return mapped;
};

// Narrows an answer to the concrete indices and fields one pattern asked for: indices the patterns
// reach now but did not when they were resolved are ignored.
const narrow = (
  mapped: Map<string, Set<string>>,
  indices: string[],
  fields: string[]
): MappedFieldsByIndex => {
  const wanted = new Set(fields);
  return new Map(
    indices.map((name): [string, ReadonlySet<string>] => [
      name,
      new Set([...(mapped.get(name) ?? [])].filter((field) => wanted.has(field))),
    ])
  );
};

/**
 * Resolves which of the requested fields each concrete index maps, keyed by pattern, with one
 * field-capabilities call for every pattern together; if that fails each pattern is retried alone
 * so a failure stays with its own sources. The calls name the patterns, and each answer is narrowed
 * to the pattern's resolved indices.
 */
export const resolveFieldAvailability = async (
  client: ElasticsearchClient,
  sources: FieldAvailabilityRequest[]
): Promise<Map<string, FieldAvailabilityResult>> => {
  const byPattern = new Map<string, { indices: string[]; fields: string[] }>();
  sources.forEach(({ indexPattern, indices, fields }) => {
    const known = byPattern.get(indexPattern);
    byPattern.set(indexPattern, {
      indices: sortedUnion([known?.indices ?? [], indices]),
      fields: sortedUnion([known?.fields ?? [], fields]),
    });
  });

  // A pattern with no indices or no fields has nothing to ask: every index maps nothing asked.
  const results = new Map<string, FieldAvailabilityResult>(
    [...byPattern].map(([pattern, { indices }]) => [
      pattern,
      { failed: false, mappedByIndex: narrow(new Map(), indices, []) },
    ])
  );
  const asking = [...byPattern].filter(
    ([, { indices, fields }]) => indices.length > 0 && fields.length > 0
  );
  if (asking.length === 0) {
    return results;
  }

  const batched = await loadMappedFields(
    client,
    asking.map(([pattern]) => pattern).sort(),
    sortedUnion(asking.map(([, { fields }]) => fields))
  ).catch(() => undefined);
  if (batched) {
    asking.forEach(([pattern, { indices, fields }]) => {
      results.set(pattern, { failed: false, mappedByIndex: narrow(batched, indices, fields) });
    });
    return results;
  }

  const retried = await Promise.allSettled(
    asking.map(([pattern, { fields }]) => loadMappedFields(client, [pattern], fields))
  );
  asking.forEach(([pattern, { indices, fields }], position) => {
    const outcome = retried[position];
    if (outcome.status === 'fulfilled') {
      results.set(pattern, {
        failed: false,
        mappedByIndex: narrow(outcome.value, indices, fields),
      });
      return;
    }
    const { status, reason } = toSourceError(pattern, outcome.reason);
    results.set(pattern, {
      failed: true,
      status,
      reason: `field capabilities request failed: ${reason}`,
    });
  });
  return results;
};

/**
 * Decides whether a plan can run: at least one of its indices must map every field of at least one
 * identity composition. Attribute fields mapped in none of its indices are listed, not fatal.
 */
export const planAvailability = (
  plan: QueryPlan,
  mappedByIndex: MappedFieldsByIndex,
  compositions: string[][]
): PlanAvailability => {
  const { indices, indexPattern, attributes } = plan;
  const mappedSets = indices.map((name) => mappedByIndex.get(name) ?? new Set<string>());
  const unavailableFields = [...new Set(attributes.map(({ field }) => field))].filter(
    (field) => !mappedSets.some((mapped) => mapped.has(field))
  );
  const usable = mappedSets.some((mapped) =>
    compositions.some((fields) => fields.every((field) => mapped.has(field)))
  );
  if (usable) {
    return { usable, unavailableFields };
  }
  const wanted = compositions.map((fields) => fields.join(' + ')).join(', ');
  return {
    usable,
    reason: `no index behind "${indexPattern}" maps every field of an identity composition (${wanted})`,
    unavailableFields,
  };
};
