/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure helpers for the parallel rule + embedding entity resolution model
 * documented in `.claude/er-v2-parallel-resolution-rfc.md`. Both the
 * `ResolutionClient` and the maintainers feed per-source verdicts into
 * {@link computeParallelMerge}; the result is what gets stamped on the alias
 * doc plus what the legacy single-slot fields mirror.
 *
 * No I/O here — the file is intentionally test-friendly. Higher-level callers
 * own the read-modify-write loop against Elasticsearch.
 */

/**
 * The set of automated + manual sources that can each form an opinion for an
 * alias. Mirrors the schema slots added by Phase R1 of the parallel-ER RFC:
 * `entity.relationships.resolution.by_<source>.*`.
 */
export type ResolutionSource = 'rule' | 'embedding' | 'manual';

/** Per-source verdict shape that lives at `entity.relationships.resolution.by_<source>.*`. */
export interface PerSourceVerdict {
  /** Target entity id this source thinks the alias resolves to. */
  resolvedTo: string | null;
  /** ISO-8601 string. Optional — only used by callers that bother to stamp it. */
  resolvedAt?: string;
  /** Cosine / calibrated confidence. Only embedding-style sources set this. */
  score?: number;
  /** Inference endpoint id. Only embedding-style sources set this. */
  modelId?: string;
}

export interface ParallelResolutionState {
  rule?: PerSourceVerdict | null;
  embedding?: PerSourceVerdict | null;
  manual?: PerSourceVerdict | null;
}

export interface ParallelMergeResult {
  /** What the UI / grouping layer should treat as canonical. */
  effectiveTo: string | null;
  /** True when at least two automated sources disagree on the target. */
  divergent: boolean;
  /**
   * Which source `effectiveTo` came from. Useful for legacy
   * `entity.relationships.resolution.resolved_by` mirroring; `null` when no
   * source has an opinion.
   */
  effectiveSource: ResolutionSource | null;
}

/**
 * Resolve the canonical target + divergence flag from the per-source
 * verdicts. Policy (RFC §5):
 *
 * 1. If `manual` exists, it wins. `divergent` is true if any other source
 *    disagrees with the manual override (the analyst is informed but the
 *    manual call still stands).
 * 2. Otherwise: if zero automated sources have opinions, return `null`.
 * 3. Otherwise: if every automated source that has an opinion agrees, that's
 *    the effective target and we are not divergent.
 * 4. Otherwise: rule wins on disagreement (deterministic, auditable). The
 *    embedding opinion is preserved separately so the UI can flag it.
 *
 * Symmetric in the rule/embedding inputs except for the disagreement
 * tiebreak. Pure function; no Elasticsearch access.
 */
export const computeParallelMerge = (state: ParallelResolutionState): ParallelMergeResult => {
  const ruleTo = pickTarget(state.rule);
  const embeddingTo = pickTarget(state.embedding);
  const manualTo = pickTarget(state.manual);

  if (manualTo !== null) {
    const conflicts = [ruleTo, embeddingTo].some((other) => other !== null && other !== manualTo);
    return { effectiveTo: manualTo, divergent: conflicts, effectiveSource: 'manual' };
  }

  const present: Array<{ source: ResolutionSource; target: string }> = [];
  if (ruleTo !== null) present.push({ source: 'rule', target: ruleTo });
  if (embeddingTo !== null) present.push({ source: 'embedding', target: embeddingTo });

  if (present.length === 0) {
    return { effectiveTo: null, divergent: false, effectiveSource: null };
  }

  const allAgree = present.every((p) => p.target === present[0].target);
  if (allAgree) {
    return { effectiveTo: present[0].target, divergent: false, effectiveSource: present[0].source };
  }

  // Disagreement: prefer rule over embedding so the canonical link is
  // deterministic. The full per-source state is preserved on disk so the UI
  // surfaces the disagreement explicitly.
  const ruleEntry = present.find((p) => p.source === 'rule');
  const fallback = present[0];
  const winner = ruleEntry ?? fallback;
  return { effectiveTo: winner.target, divergent: true, effectiveSource: winner.source };
};

const pickTarget = (verdict: PerSourceVerdict | null | undefined): string | null => {
  if (!verdict || !verdict.resolvedTo) return null;
  return verdict.resolvedTo;
};

/**
 * Dotted ES field path for the per-source `resolved_to` slot. Mirrors the
 * mapping registered by `embeddingSlotFields`-style helpers in
 * `common/domain/definitions/common_fields.ts`.
 */
export const perSourceResolvedToField = (source: ResolutionSource): string =>
  `entity.relationships.resolution.by_${source}.resolved_to`;

const PER_SOURCE_RESOLVED_AT: Record<ResolutionSource, string> = {
  rule: 'entity.relationships.resolution.by_rule.resolved_at',
  embedding: 'entity.relationships.resolution.by_embedding.resolved_at',
  manual: 'entity.relationships.resolution.by_manual.resolved_at',
};

const PER_SOURCE_SCORE = 'entity.relationships.resolution.by_embedding.score';
const PER_SOURCE_MODEL = 'entity.relationships.resolution.by_embedding.model_id';

/**
 * Pull the existing per-source verdicts off an entity `_source` doc so we
 * can recompute the merge after an additional write. Tolerant of partially
 * populated docs and of both flat (dotted-key) and nested shapes since the
 * latest index supports either.
 */
export const readParallelStateFromDoc = (
  doc: Record<string, unknown>
): ParallelResolutionState => ({
  rule: readVerdict(doc, 'rule'),
  embedding: readVerdict(doc, 'embedding'),
  manual: readVerdict(doc, 'manual'),
});

const readVerdict = (
  doc: Record<string, unknown>,
  source: ResolutionSource
): PerSourceVerdict | null => {
  const resolvedTo = readField(doc, perSourceResolvedToField(source));
  if (typeof resolvedTo !== 'string' || resolvedTo === '') return null;

  const resolvedAtRaw = readField(doc, PER_SOURCE_RESOLVED_AT[source]);
  const verdict: PerSourceVerdict = { resolvedTo };
  if (typeof resolvedAtRaw === 'string') verdict.resolvedAt = resolvedAtRaw;

  if (source === 'embedding') {
    const score = readField(doc, PER_SOURCE_SCORE);
    if (typeof score === 'number') verdict.score = score;
    const modelId = readField(doc, PER_SOURCE_MODEL);
    if (typeof modelId === 'string') verdict.modelId = modelId;
  }
  return verdict;
};

/**
 * Builds the bulk-update doc payload for a single entity in the source-aware
 * write path. Stamps the per-source slot AND the canonical merge mirrors
 * (`effective_to`, `divergent`, plus the legacy `resolved_to` /
 * `resolved_by` / `score` / `model_id`) so existing readers keep working
 * during the deprecation window.
 *
 * Optional fields with `undefined` values are intentionally omitted from
 * the doc rather than written as `null` — matches the pre-RFC behavior of
 * the single-slot path so partial provenance never overwrites a previously
 * stamped score / model_id.
 */
export const buildSourceAwareLinkDoc = ({
  source,
  verdict,
  merge,
}: {
  source: ResolutionSource;
  verdict: PerSourceVerdict;
  merge: ParallelMergeResult;
}): Record<string, unknown> => {
  const doc: Record<string, unknown> = {
    [perSourceResolvedToField(source)]: verdict.resolvedTo,
  };
  if (verdict.resolvedAt !== undefined) {
    doc[PER_SOURCE_RESOLVED_AT[source]] = verdict.resolvedAt;
  }
  if (source === 'embedding') {
    if (verdict.score !== undefined) doc[PER_SOURCE_SCORE] = verdict.score;
    if (verdict.modelId !== undefined) doc[PER_SOURCE_MODEL] = verdict.modelId;
  }

  doc['entity.relationships.resolution.effective_to'] = merge.effectiveTo;
  doc['entity.relationships.resolution.divergent'] = merge.divergent;

  // Legacy single-slot mirrors. Kept in sync so existing dashboards /
  // queries / Scout fixtures continue to read the canonical effective link.
  doc['entity.relationships.resolution.resolved_to'] = merge.effectiveTo;
  if (merge.effectiveSource !== null) {
    doc['entity.relationships.resolution.resolved_by'] = merge.effectiveSource;
  }
  // The legacy score / model_id mirrors only make sense for the embedding
  // source. When effective is rule/manual we leave them untouched (don't
  // null out a previously-stamped embedding score).
  if (merge.effectiveSource === 'embedding') {
    if (verdict.score !== undefined) {
      doc['entity.relationships.resolution.score'] = verdict.score;
    }
    if (verdict.modelId !== undefined) {
      doc['entity.relationships.resolution.model_id'] = verdict.modelId;
    }
  }

  return doc;
};

/**
 * Read a possibly-nested possibly-dotted field path from an entity doc.
 * Tolerates shapes like `{ entity: { relationships: { ... } } }` and the
 * already-dotted `{ 'entity.relationships.resolution.by_rule.resolved_to': ... }`.
 */
const readField = (doc: Record<string, unknown>, path: string): unknown => {
  const direct = doc[path];
  if (direct !== undefined) return direct;
  const segments = path.split('.');
  let cursor: unknown = doc;
  for (const seg of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
};
