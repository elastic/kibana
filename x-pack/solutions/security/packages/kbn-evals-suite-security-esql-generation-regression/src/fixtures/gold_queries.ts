/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesCreateRequest, IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import { validateQuery } from '@kbn/esql-language';
import { esqlGenerationDataset } from '../dataset';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndicesCreateRequests } from './indices';

/**
 * Static executability check for the dataset's gold queries.
 *
 * The dataset is only as good as its references: a gold that names a column
 * the fixture mappings do not define, a source no fixture index matches, or a
 * construct that is not valid ES|QL makes `ES|QL Result Equivalence` and
 * `ES|QL Execution Validity` score 0 on *every* model (the failure is
 * data-side, so no candidate can influence it) and hands the LLM judge a
 * reference that cannot be executed. Ten of the 31 examples were in that state
 * before this check existed.
 *
 * The check reconstructs the cluster-side view of a gold query from the same
 * fixture definitions the suite installs (`indices.ts` mappings, `documents.ts`
 * seeded APM documents) and feeds them to `@kbn/esql-language`'s validator as
 * `getSources` / `getColumnsFor` callbacks — the same callbacks Kibana wires to
 * field caps in the editor. It is deliberately offline (no cluster): the
 * package's unit tests run without Elasticsearch, and the run-time truth is
 * still the live evaluation.
 *
 * Deliberately *not* covered here:
 * - Enrichment policies: `ENRICH <policy>` takes its columns from a policy that
 *   lives in the cluster, and the offline validator has no policy metadata, so
 *   the check stops at the enrich command. A gold naming a policy the
 *   environment does not provision (`cannot find enrich policy`) is a separate
 *   defect class — it is asserted where the policies are created, in the
 *   fixture setup, and it must not be reported here as a mapping mismatch.
 * - Type-level failures the client validator reports but Elasticsearch coerces,
 *   e.g. `Invalid input types` for `destination.port NOT IN (22)` (a `long`
 *   against an integer literal) or `AVG` over a `float` field. No gold of the
 *   suite's golden run ever failed that way, so reporting them here would fail
 *   CI on golds the cluster executes happily. They are still re-checked with
 *   the literals cast, because the validator stops at the first error of an
 *   expression and such a complaint can be hiding a mapping mismatch behind it.
 * - Data-dependent failures (a gold that executes but matches no rows). Those
 *   are visible in the evaluator metadata of a real run.
 */

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
}

export interface FixtureIndex {
  /** Concrete index name the fixture creates. */
  name: string;
  /** Flattened field paths the index exposes, e.g. `transaction.duration.us`. */
  fields: Array<{ name: string; type: string }>;
}

type ValidateQueryCallbacks = NonNullable<Parameters<typeof validateQuery>[1]>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T[0-9:.]+Z?)?$/;

/**
 * ES auto-maps the seeded APM documents on first ingest, so their field type
 * has to be inferred from the seeded value. The inference only needs to be
 * close enough for the validator's function-signature checks (e.g. `AVG`
 * requires a numeric argument) — the authoritative types come from the
 * cluster, not from here.
 */
function inferDocumentFieldType(value: unknown): string {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'double';
  if (typeof value === 'string') return ISO_DATE.test(value) ? 'date' : 'keyword';
  return 'keyword';
}

function flattenMapping(
  properties: Record<string, MappingProperty>,
  prefix = ''
): Array<{ name: string; type: string }> {
  return Object.entries(properties).flatMap(([name, definition]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    if (definition.properties) {
      return flattenMapping(definition.properties, path);
    }
    return [{ name: path, type: definition.type ?? 'keyword' }];
  });
}

function flattenDocument(
  document: Record<string, unknown>,
  prefix = ''
): Array<{ name: string; type: string }> {
  return Object.entries(document).flatMap(([name, value]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenDocument(value as Record<string, unknown>, path);
    }
    return [{ name: path, type: inferDocumentFieldType(value) }];
  });
}

/** Every index the fixtures make resolvable, with the fields it exposes. */
export const fixtureIndices: FixtureIndex[] = [
  ...esqlFixtureIndicesCreateRequests.map((request: IndicesCreateRequest) => ({
    name: request.index,
    fields: flattenMapping((request.mappings?.properties ?? {}) as Record<string, MappingProperty>),
  })),
  ...esqlFixtureDocumentRequests.map((request: IndexRequest) => ({
    name: request.index,
    fields: flattenDocument((request.document ?? {}) as Record<string, unknown>),
  })),
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Mirrors Elasticsearch wildcard semantics for the patterns the golds use. */
function matchesPattern(indexName: string, pattern: string): boolean {
  const matcher = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
  return matcher.test(indexName);
}

/**
 * Resolves an ES|QL source expression (`logs-*`, `a,b`, `"employees-*"`) to the
 * fixture indices it addresses. Exclusions (`-logs-*`) are dropped: no gold
 * query uses them, and a fixture-level exclusion check would be guesswork.
 */
export function resolveFixtureIndices(source: string): FixtureIndex[] {
  const patterns = source
    .split(',')
    .map((part) => part.trim().replace(/^["`]/, '').replace(/["`]$/, ''))
    .filter((part) => part.length > 0 && !part.startsWith('-'));

  return fixtureIndices.filter((index) =>
    patterns.some((pattern) => matchesPattern(index.name, pattern))
  );
}

/**
 * Extracts the sources of a query's `FROM` / `TS` clause. The query shapes
 * accepted here are the ones the dataset holds (a leading source command,
 * optionally followed by pipes) plus the bare `FROM <indices>` statements the
 * ES|QL validator itself passes to `getColumnsFor`.
 */
export function extractSources(query: string): string[] {
  const match = /(?:^|\n|\|)\s*(?:from|ts)\s+([^\n|]+)/i.exec(query);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((part) => part.trim().replace(/^["`]/, '').replace(/["`]$/, ''))
    .filter((part) => part.length > 0 && !part.startsWith('-'));
}

function fieldsForQuery(
  query: string
): Array<{ name: string; type: string; userDefined: boolean }> {
  const sources = extractSources(query);
  const indices = sources.flatMap((source) => resolveFixtureIndices(source));
  const fields = new Map<string, string>();
  for (const index of indices) {
    for (const field of index.fields) {
      if (!fields.has(field.name)) fields.set(field.name, field.type);
    }
  }
  return Array.from(fields, ([name, type]) => ({ name, type, userDefined: false }));
}

const messageText = (message: { text?: string; message?: string }): string =>
  typeof message.text === 'string' ? message.text : String(message.message ?? message);

/**
 * The validator does not widen numeric literals the way the cluster does:
 * `destination.port NOT IN (80, 443)` compares a `long` column against
 * `integer` literals and is rejected offline, while Elasticsearch coerces it.
 * Because the validator reports only the first error of an expression, that
 * complaint can also hide a mapping-level error behind it — the dataset's
 * "Locating Suspicious Outbound Connections" gold reported the `NOT IN` type
 * error and never mentioned that the fixture maps `network.direction`, not
 * `direction`. Casting the literals to the list's own numeric type removes the
 * false type error and lets the validator continue, so the check can keep
 * ignoring `Invalid input types` without ignoring what it hides.
 */
function castNumericInLists(query: string): string {
  return query.replace(
    /\b(not\s+in|in)\s*\(([^()]*)\)/gi,
    (match, operator: string, list: string) => {
      const values = list.split(',').map((value) => value.trim());
      if (values.length === 0 || !values.every((value) => /^-?\d+(?:\.\d+)?$/.test(value))) {
        return match;
      }
      const cast = values.some((value) => value.includes('.')) ? 'TO_DOUBLE' : 'TO_LONG';
      return `${operator} (${values.map((value) => `${cast}(${value})`).join(', ')})`;
    }
  );
}

/**
 * `DISSECT` / `GROK` are the one construct whose source field the validator
 * does not resolve at all — `DISSECT definitely_not_a_field "%{a}"` validates
 * clean — so a gold that dissects a field the mappings do not have is
 * invisible to it. The dataset's SSH-port example dissects `user_agent`, which
 * the fixture maps only as `user_agent.original`, and the cluster rejected it
 * with `Unknown column [user_agent]`. Resolve those fields here.
 */
function dissectSourceFields(query: string): string[] {
  return Array.from(query.matchAll(/(?:^|\n|\|)\s*(?:dissect|grok)\s+([^\s,|]+)/gi), (match) =>
    match[1].replace(/^[`"']+|[`"']+$/g, '')
  );
}

/**
 * Cuts a gold at its first `ENRICH` command. `ENRICH <policy>` contributes the
 * policy's columns, which only the cluster knows, so everything from the enrich
 * onwards is outside what a mapping-based check can prove — while everything
 * before it still is. Returns the query untouched when it holds no enrich.
 */
function offlineCheckableQuery(query: string): { query: string; stoppedAt?: string } {
  const match = /(?:^|\n|\|)\s*enrich\s+\S+[^\n|]*/i.exec(query);
  if (!match || match.index === 0) return { query };

  return { query: query.slice(0, match.index), stoppedAt: match[0].trim() };
}

export interface GoldQueryCheck {
  /** Position of the example in `esqlGenerationDataset`. */
  index: number;
  question: string;
  query: string;
  /** Sources resolved from the gold's `FROM` clause. */
  sources: string[];
  /** Fixture indices those sources resolve to. */
  matchedIndices: string[];
  /** Field paths available on `matchedIndices`. */
  columns: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates every gold query against the fixture mappings. A non-empty
 * `errors` array means the gold cannot run on the indices the suite creates,
 * so the example can only ever score 0 for execution-based evaluators.
 */
export async function checkGoldQueries(
  examples: ReadonlyArray<{
    input?: { question?: string };
    output?: { query?: string };
  }> = esqlGenerationDataset
): Promise<GoldQueryCheck[]> {
  const callbacks: ValidateQueryCallbacks = {
    getSources: async () =>
      fixtureIndices.map(({ name }) => ({
        name,
        hidden: false,
        type: 'Index' as const,
      })),
    getColumnsFor: async (ctx) =>
      fieldsForQuery(ctx?.query ?? '') as ReturnType<
        NonNullable<ValidateQueryCallbacks['getColumnsFor']>
      >,
  };

  return Promise.all(
    examples.map(async (example, index): Promise<GoldQueryCheck> => {
      const query = example.output?.query ?? '';
      const sources = extractSources(query);
      const matchedIndices = sources.flatMap((source) =>
        resolveFixtureIndices(source).map(({ name }) => name)
      );
      const columns = Array.from(
        new Set(
          matchedIndices.flatMap(
            (name) => fixtureIndices.find((index_) => index_.name === name)?.fields ?? []
          )
        ),
        ({ name }) => name
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      const unresolved = sources.filter((source) => resolveFixtureIndices(source).length === 0);
      if (unresolved.length > 0) {
        errors.push(
          `references ${unresolved
            .map((source) => `"${source}"`)
            .join(', ')} — no fixture index in indices.ts/documents.ts matches`
        );
      }

      if (query.trim().length === 0) {
        errors.push('gold query is empty');
      } else {
        const { query: checkable, stoppedAt } = offlineCheckableQuery(query);
        if (stoppedAt) {
          warnings.push(
            `not validated from \`${stoppedAt}\` on: an enrich policy's columns live in the cluster, not in these mappings`
          );
        }

        const { errors: validationErrors, warnings: validationWarnings } = await validateQuery(
          checkable,
          callbacks,
          { invalidateColumnsCache: true }
        );
        // The validator's signature table does not widen numeric literals the
        // way the cluster does (`long NOT IN (22)`, `AVG(float)`, `float +
        // float`), so `Invalid input types` says nothing about whether a gold
        // runs — the suite's golden run never hit it. Mapping-level errors
        // (unknown column, unknown source) are what this check owns.
        const offlineUnreliable = /^Invalid input types for /;
        const messages = validationErrors.map(messageText);
        if (messages.some((text) => offlineUnreliable.test(text))) {
          // That complaint is also the first error of its expression, so it can
          // hide a mapping-level error behind it; re-run with the literals cast
          // and keep whatever surfaces (see `castNumericInLists`).
          const { errors: unmaskedErrors } = await validateQuery(
            castNumericInLists(checkable),
            callbacks,
            { invalidateColumnsCache: true }
          );
          messages.push(...unmaskedErrors.map(messageText));
        }
        errors.push(...messages.filter((text) => !offlineUnreliable.test(text)));
        warnings.push(...validationWarnings.map(messageText));

        // `DISSECT`/`GROK` sources are the one column reference the validator
        // leaves unresolved; check them against the same field list.
        const knownColumns = new Set(fieldsForQuery(checkable).map(({ name }) => name));
        for (const field of dissectSourceFields(checkable)) {
          if (!knownColumns.has(field)) {
            errors.push(
              `Unknown column "${field}" (a dissected field must be in the fixture mappings)`
            );
          }
        }
      }

      return {
        index,
        question: example.input?.question ?? '',
        query,
        sources,
        matchedIndices,
        columns,
        errors,
        warnings,
      };
    })
  );
}
