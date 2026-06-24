/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphRoleAliasContext } from '@kbn/entity-store/server';
import { INDEX_PATTERN_REGEX } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import {
  GRAPH_ACTOR_EUID_SOURCE_FIELDS,
  GRAPH_TARGET_EUID_SOURCE_FIELDS,
  type EuidSourceFields,
} from './constants';

/**
 * Provenance columns the prelude writes and the events query carries to the UI.
 * Both are `graph.knowledge_indicator.*` so they never collide with ECS or with
 * the entity-store `<type>.entity.knowledge_indicator.*` STATS namespace used by
 * log extraction.
 */
export const KI_PROVENANCE_FEATURE_UUID_FIELD = 'graph.knowledge_indicator.feature_uuid';
export const KI_PROVENANCE_CONFIDENCE_FIELD = 'graph.knowledge_indicator.confidence';

export interface GraphAliasPrelude {
  /**
   * ES|QL `EVAL` statements (no leading newline) to splice immediately after
   * `FROM … METADATA _id, _index` and before actor resolution. Empty string
   * when there are no usable alias contexts — callers MUST treat empty as
   * "splice nothing" so the query is byte-identical to the no-KI path.
   */
  esql: string;
  /** True when `esql` is non-empty (drives provenance folding + KEEP additions). */
  hasAliases: boolean;
  /**
   * Target-role source field paths to add to the `showUnknownTarget: false`
   * DSL `exists` pre-filter, so KI-inferred targets survive the pre-ES|QL filter.
   */
  targetSourceFields: string[];
  /** Provenance columns to KEEP and fold into actor/target/edge docData. */
  provenanceColumns: readonly string[];
}

// Field-path identifiers safe to embed inside ES|QL backticks. Disallows the
// backtick itself plus whitespace/control characters; allows the dotted ECS /
// non-ECS path shape (e.g. `azure.signinlogs.properties.user_principal_name`).
const FIELD_PATH_REGEX = /^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/;
// Feature UUIDs are v5 uuids; keep the guard tight so nothing else reaches a literal.
const FEATURE_UUID_REGEX = /^[A-Za-z0-9._:-]+$/;

const EMPTY_PRELUDE: GraphAliasPrelude = {
  esql: '',
  hasAliases: false,
  targetSourceFields: [],
  provenanceColumns: [],
};

const flattenSourceFields = (fields: EuidSourceFields): string[] => [
  ...fields.user,
  ...fields.host,
  ...fields.service,
  ...fields.generic,
];

// The live, euid-derived destination vocabulary. `.all` (event.dataset,
// event.module, data_stream.dataset) is intentionally excluded — those are
// namespace-context fields, not identity slots, and must never be alias targets.
const ACTOR_DESTINATIONS = new Set(flattenSourceFields(GRAPH_ACTOR_EUID_SOURCE_FIELDS));
const TARGET_DESTINATIONS = new Set(flattenSourceFields(GRAPH_TARGET_EUID_SOURCE_FIELDS));
const ACTION_DESTINATION = 'event.action';
const VALID_DESTINATIONS = new Set<string>([
  ...ACTOR_DESTINATIONS,
  ...TARGET_DESTINATIONS,
  ACTION_DESTINATION,
]);

const quoteField = (field: string): string => `\`${field}\``;
const quoteStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

interface ResolvedContext {
  index: number;
  guard: string;
  featureUuid: string;
  confidence: number;
  /** destination -> ordered, validated, quoted source COALESCE expression */
  destinations: Map<string, string>;
}

/**
 * Builds the per-stream `data_stream.dataset` / `_index` guard for a context.
 * `_index LIKE "*<stream>*"` matches the stream's backing data-stream indices
 * (`.ds-<stream>-…`); the `data_stream.dataset == "<stream>"` arm covers the
 * cases where the dataset equals the stream name. Index patterns / stream names
 * are validated against `INDEX_PATTERN_REGEX` before interpolation.
 */
const buildGuard = (context: GraphRoleAliasContext): string | undefined => {
  const safePatterns = context.indexPatterns.filter((pattern) => INDEX_PATTERN_REGEX.test(pattern));
  if (safePatterns.length === 0) {
    return undefined;
  }
  const indexArms = safePatterns.map(
    (pattern) => `_index LIKE ${quoteStringLiteral(`*${pattern}*`)}`
  );
  const datasetArm = INDEX_PATTERN_REGEX.test(context.streamName)
    ? `${quoteField('data_stream.dataset')} == ${quoteStringLiteral(context.streamName)}`
    : undefined;
  const arms = datasetArm ? [...indexArms, datasetArm] : indexArms;
  return `(${arms.join(' OR ')})`;
};

const sourceCoalesceExpr = (sources: readonly string[]): string | undefined => {
  const safeSources = sources.filter((source) => FIELD_PATH_REGEX.test(source));
  if (safeSources.length === 0) {
    return undefined;
  }
  // Every graph-role destination is an ECS keyword identity field, but vendor
  // source paths can be any ES type (e.g. `gitlab.audit.target_id` is a `long`,
  // an `*.id` can be numeric, etc.). ES|QL COALESCE/CASE require all branches to
  // share a single type, and the slot-fill folds these per-stream arms together
  // with the keyword destination — so a single numeric source aborts the whole
  // graph query with `verification_exception ... must be [keyword], found ...
  // type [long]`. Cast each source to keyword via TO_STRING so heterogeneous
  // vendor types are normalized to the identity slot's type.
  return `COALESCE(${safeSources
    .map((source) => `TO_STRING(MV_FIRST(${quoteField(source)}))`)
    .join(', ')})`;
};

const resolveContexts = (contexts: GraphRoleAliasContext[]): ResolvedContext[] => {
  const resolved: ResolvedContext[] = [];
  contexts.forEach((context) => {
    if (!FEATURE_UUID_REGEX.test(context.featureUuid)) {
      return;
    }
    const guard = buildGuard(context);
    if (!guard) {
      return;
    }
    const destinations = new Map<string, string>();
    for (const [destination, sources] of context.aliases) {
      if (!VALID_DESTINATIONS.has(destination)) {
        continue;
      }
      const expr = sourceCoalesceExpr(sources);
      if (expr) {
        destinations.set(destination, expr);
      }
    }
    if (destinations.size === 0) {
      return;
    }
    resolved.push({
      index: resolved.length,
      guard,
      featureUuid: context.featureUuid,
      confidence: Math.round(context.confidence),
      destinations,
    });
  });
  return resolved;
};

const firedColumn = (index: number): string => `_ki_fired_${index}`;

/**
 * Builds the Streams-KI graph alias prelude: per-stream guarded `COALESCE`s that
 * fill canonical ECS actor / target / action slots from non-ECS source paths,
 * plus `graph.knowledge_indicator.*` provenance columns. COALESCE writes into a
 * slot only when it is null, so native ECS values always win; guards keep one
 * stream's aliases from leaking onto another stream's documents.
 *
 * Returns {@link EMPTY_PRELUDE} (empty `esql`, no folding) when there are no
 * usable contexts — the off-by-default path that keeps the graph byte-identical.
 */
export const buildGraphAliasPrelude = (
  contexts: GraphRoleAliasContext[] = []
): GraphAliasPrelude => {
  const resolved = resolveContexts(contexts);
  if (resolved.length === 0) {
    return EMPTY_PRELUDE;
  }

  // 1) Per-context "fired" flags. Computed BEFORE any slot fill so they read the
  //    raw destination value: a context fired iff its guard matches AND at least
  //    one of its destinations was null but a source supplied a value. This keeps
  //    the "Inferred (KI)" provenance honest (native ECS values do not get flagged).
  const firedStatements = resolved.map((context) => {
    const anyInferred = [...context.destinations.entries()]
      .map(([destination, expr]) => `(${quoteField(destination)} IS NULL AND ${expr} IS NOT NULL)`)
      .join(' OR ');
    return `| EVAL ${firedColumn(context.index)} = ${context.guard} AND (${anyInferred})`;
  });

  // 2) Slot fills, grouped per destination so a destination targeted by multiple
  //    streams becomes a single COALESCE with one guarded CASE arm per stream.
  const destinationToArms = new Map<string, string[]>();
  resolved.forEach((context) => {
    context.destinations.forEach((expr, destination) => {
      const arm = `CASE(${context.guard}, ${expr}, null)`;
      const arms = destinationToArms.get(destination) ?? [];
      arms.push(arm);
      destinationToArms.set(destination, arms);
    });
  });
  const slotFillStatements = [...destinationToArms.entries()].map(
    ([destination, arms]) =>
      `| EVAL ${quoteField(destination)} = COALESCE(${quoteField(destination)}, ${arms.join(', ')})`
  );

  // 3) Provenance columns derived from the fired flags.
  const uuidArms = resolved
    .map((context) => `${firedColumn(context.index)}, ${quoteStringLiteral(context.featureUuid)}`)
    .join(', ');
  const confidenceArms = resolved
    .map((context) => `${firedColumn(context.index)}, ${context.confidence}`)
    .join(', ');
  const provenanceStatements = [
    `| EVAL ${quoteField(KI_PROVENANCE_FEATURE_UUID_FIELD)} = CASE(${uuidArms})`,
    `| EVAL ${quoteField(KI_PROVENANCE_CONFIDENCE_FIELD)} = CASE(${confidenceArms})`,
  ];

  const esql = [...firedStatements, ...slotFillStatements, ...provenanceStatements].join('\n');

  // Target-role sources for the showUnknownTarget=false DSL exists pre-filter.
  const targetSourceFields = new Set<string>();
  contexts.forEach((context) => {
    for (const [destination, sources] of context.aliases) {
      if (!TARGET_DESTINATIONS.has(destination)) {
        continue;
      }
      sources
        .filter((source) => FIELD_PATH_REGEX.test(source))
        .forEach((s) => targetSourceFields.add(s));
    }
  });

  return {
    esql,
    hasAliases: true,
    targetSourceFields: [...targetSourceFields],
    provenanceColumns: [KI_PROVENANCE_FEATURE_UUID_FIELD, KI_PROVENANCE_CONFIDENCE_FIELD],
  };
};
