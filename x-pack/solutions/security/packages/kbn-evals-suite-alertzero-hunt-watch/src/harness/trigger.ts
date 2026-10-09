/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { randomUUID } from 'crypto';
import type { Phase } from '../types';

/**
 * Per-phase ES-minted report ids (rev7 B2): the ingest route is an open
 * document with `op_type: create` and no caller-supplied id, so Elasticsearch
 * mints a fresh id per ingest. One ingest per (model, rep, phase, report);
 * ids are distinct within a rep.
 */
export const ingestDocumentId = (): string => randomUUID();

export interface HarnessIdPlan {
  /** run key -> ES-minted id */
  ids: Record<string, string>;
}

export const harnessIds = (
  model: string,
  rep: number,
  reports: string[],
  { reuseAcrossPhases = false }: { reuseAcrossPhases?: boolean } = {}
): HarnessIdPlan => {
  const ids: Record<string, string> = {};
  const perReport: Record<string, string> = {}; // mutant cache: one ingest per report per rep
  for (const phase of ['E0', 'E+', 'E-'] as Phase[]) {
    for (const report of reports) {
      const key = `g5-ea8ba99-${model}-r${rep}-${phase}-${report}`;
      if (reuseAcrossPhases) {
        perReport[report] ??= ingestDocumentId();
        ids[key] = perReport[report];
      } else {
        ids[key] = ingestDocumentId();
      }
    }
  }
  return { ids };
};

export const distinctIdsOk = (plan: HarnessIdPlan): boolean => {
  const values = Object.values(plan.ids);
  return new Set(values).size === values.length;
};

/** candidates_route.gen.ts:29 — report_ids max 10 per manual trigger. */
export const REPORT_IDS_CAP = 10;

export const batches = (ids: string[], cap = REPORT_IDS_CAP): string[][] => {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += cap) out.push(ids.slice(i, i + cap));
  return out;
};

/**
 * Model of POST /internal/alertzero/hunt/candidates with named report_ids
 * (build_candidate_query.ts at the pin): ids visible in the reports index are
 * selected unless an open proposal exists for them; named ids not visible come
 * back as skipped not_found. The ingest route never refreshes, so visibility
 * needs an explicit _refresh before the trigger.
 */
export interface CandidatesRouteResponse {
  ids: string[];
  skipped: Array<{ id: string; reason: 'not_found' | 'open_proposal' }>;
}

export const candidatesRoute = (
  batch: string[],
  visible: ReadonlySet<string>
): CandidatesRouteResponse => {
  const ids: string[] = [];
  const skipped: CandidatesRouteResponse['skipped'] = [];
  for (const id of batch) {
    if (!visible.has(id)) skipped.push({ id, reason: 'not_found' });
    else ids.push(id);
  }
  return { ids, skipped };
};

/**
 * Manual-trigger driver with the per-batch candidates assertion (design v6
 * §4a): after _refresh, every batch must come back fully selected with no
 * skips. Any violation is an INVALID cell; it never shrinks the denominator.
 */
export type TriggerOutcome =
  | { ok: true; reached: number; total: number }
  | { ok: false; reason: 'per-batch'; batch: string[]; response: CandidatesRouteResponse };

export const harnessTrigger = (
  allIds: string[],
  { visible, assertPerBatch = true }: { visible: ReadonlySet<string>; assertPerBatch?: boolean }
): TriggerOutcome => {
  let reached = 0;
  for (const batch of batches(allIds)) {
    const response = candidatesRoute(batch, visible);
    if (assertPerBatch && (response.ids.length !== batch.length || response.skipped.length > 0)) {
      return { ok: false, reason: 'per-batch', batch, response };
    }
    reached += response.ids.length;
  }
  return { ok: true, reached, total: allIds.length };
};

/** rev7 R5-NB-1 "silent shrink" variant: no per-batch assertion. */
export const reachedCount = (allIds: string[], visible: ReadonlySet<string>): string => {
  const out = harnessTrigger(allIds, { visible, assertPerBatch: false });
  return out.ok ? `reached=${out.reached}/${allIds.length}` : `INVALID(per-batch)`;
};

/**
 * Foreign-hit matching rule (design v6 §6 / rev7 R5-NB-2). A hit is foreign
 * iff its concrete _index backs no seeded data stream (plus, from E+, the TI
 * fixture index). Glob semantics mirror matches_required.ts buildMatchesRequired:
 * strip '.ds-', '*' -> '.*', anchored, '-' prefixed entries are exclusions.
 */
export const compileMatches = (
  patterns: string[],
  { stripDs = true }: { stripDs?: boolean } = {}
): ((index: string) => boolean) => {
  const compile = (ps: string[]): RegExp[] =>
    ps.map((p) => new RegExp(`^${p.split('*').map(escapeRe).join('.*')}$`));
  const positive = compile(patterns.filter((p) => !p.startsWith('-')));
  const negative = compile(patterns.filter((p) => p.startsWith('-')).map((p) => p.slice(1)));
  return (index: string) => {
    const candidate = stripDs && index.startsWith('.ds-') ? index.slice('.ds-'.length) : index;
    return positive.some((r) => r.test(candidate)) && !negative.some((r) => r.test(candidate));
  };
};

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const globsForStreams = (streams: string[]): string[] => streams.flatMap((s) => [s, `${s}-*`]);

export const isForeignHitIndex = (
  index: string,
  phase: Phase,
  seededStreams: string[],
  fixtureStreams: string[],
  { stripDs = true }: { stripDs?: boolean } = {}
): boolean => {
  const allowed = phase === 'E0' ? seededStreams : [...seededStreams, ...fixtureStreams];
  return !compileMatches(globsForStreams(allowed), { stripDs })(index);
};