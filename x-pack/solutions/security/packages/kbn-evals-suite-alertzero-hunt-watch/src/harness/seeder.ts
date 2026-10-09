/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { CorpusSample, SampleDoc } from '../fixtures/load_corpus';
import { sampleBase, seededDocId } from '../datasets/labels';
import type { Phase } from '../types';

/**
 * Per-phase environment seeding (design v2): E0 = the base environment
 * (fixtures; the vendored corpus carries no separate noise docs), E+ = E0 +
 * `positive.docs` of every sample, E- = E0 + `negative.docs`. Every doc is
 * indexed with the explicit `_id` from `seededDocId`, the same function the
 * labels use, so a live hit's `id` is a label key with no translation.
 */

export interface SeedDoc {
  index: string;
  id: string;
  body: Record<string, unknown>;
}

export interface PhaseBuckets {
  /** Benign noise ids. Empty: the vendored corpus has no noise docs (see PR body). */
  noise: string[];
  /** Negative-twin docs whose content differs from their positive counterpart. */
  twinChanged: string[];
  /** Negative-twin docs identical to their positive counterpart (modulo entity ids). */
  twinRetained: string[];
  /** Threat-intel indicator fixtures (not telemetry). */
  fixture: string[];
}

export interface PhasePlan {
  docs: SeedDoc[];
  buckets: PhaseBuckets;
}

/** `azqa-*` entity ids are corpus-local; a shared id would link twin and positive docs (v2 N1a). */
const isAzqaEntityId = (v: unknown): boolean => typeof v === 'string' && v.startsWith('azqa-');

export const stripAzqaEntityIds = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.filter((x) => !isAzqaEntityId(x)).map((x) => stripAzqaEntityIds(x)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isAzqaEntityId(v)) out[k] = stripAzqaEntityIds(v);
    }
    return out as T;
  }
  return value;
};

/** `at` is seconds relative to `now` (the fixtures entry is `-3600`, one hour back). */
export const rebaseTimestamp = (at: number, nowMs: number): string =>
  new Date(nowMs + at * 1000).toISOString();

const seedDoc = (d: SampleDoc, id: string, nowMs: number): SeedDoc => ({
  index: `${d.stream}-default`,
  id,
  body: { ...stripAzqaEntityIds(d.doc), '@timestamp': rebaseTimestamp(d.at, nowMs) },
});

const fixtureId = (base: string, i: number): string => `${base}#${i}#fixture`;

const sameContent = (a: SampleDoc | undefined, b: SampleDoc): boolean =>
  a !== undefined &&
  a.stream === b.stream &&
  JSON.stringify(stripAzqaEntityIds(a.doc)) === JSON.stringify(stripAzqaEntityIds(b.doc));

export const buildPhasePlan = (
  phase: Phase,
  samples: Record<string, CorpusSample>,
  nowMs: number
): PhasePlan => {
  const docs: SeedDoc[] = [];
  const buckets: PhaseBuckets = { noise: [], twinChanged: [], twinRetained: [], fixture: [] };

  for (const [fileName, sample] of Object.entries(samples)) {
    const base = sampleBase(fileName);
    (sample.fixtures ?? []).forEach((f, i) => {
      if (!f.doc || f.at === undefined) return;
      const id = fixtureId(base, i);
      docs.push(seedDoc({ stream: f.stream, at: f.at, doc: f.doc }, id, nowMs));
      buckets.fixture.push(id);
    });

    if (phase === 'E+') {
      (sample.positive?.docs ?? []).forEach((d, i) => {
        docs.push(seedDoc(d, seededDocId(base, i, 'positive'), nowMs));
      });
    }
    if (phase === 'E-') {
      (sample.negative?.docs ?? []).forEach((d, i) => {
        const id = seededDocId(base, i, 'negative');
        docs.push(seedDoc(d, id, nowMs));
        (sameContent(sample.positive?.docs?.[i], d)
          ? buckets.twinRetained
          : buckets.twinChanged
        ).push(id);
      });
    }
  }
  return { docs, buckets };
};

/** Every stream any phase can write to; the reset covers all of them every time. */
export const seededIndexNames = (samples: Record<string, CorpusSample>): string[] => {
  const names = new Set<string>();
  for (const s of Object.values(samples)) {
    for (const part of [s.positive?.docs, s.negative?.docs] as Array<SampleDoc[] | undefined>) {
      for (const d of part ?? []) names.add(`${d.stream}-default`);
    }
    for (const f of s.fixtures ?? []) names.add(`${f.stream}-default`);
  }
  return [...names].sort();
};

export type SeederEsClient = Client;

export class PhaseSeeder {
  constructor(
    private readonly esClient: SeederEsClient,
    private readonly samples: Record<string, CorpusSample>
  ) {}

  /** Empties every seeded index, so each phase starts from nothing. */
  async reset(): Promise<void> {
    await this.esClient.deleteByQuery({
      index: seededIndexNames(this.samples),
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  }

  /** Resets, then indexes the phase's docs with their label-space ids. Throws on any item error. */
  async seed(phase: Phase, nowMs: number = Date.now()): Promise<PhasePlan> {
    await this.reset();
    const plan = buildPhasePlan(phase, this.samples, nowMs);
    if (plan.docs.length > 0) {
      const operations = plan.docs.flatMap((d) => [
        { create: { _index: d.index, _id: d.id } },
        d.body,
      ]);
      const response = await this.esClient.bulk({ operations, refresh: 'wait_for' });
      if (response.errors) {
        const failed = response.items
          .map((item) => item.create)
          .filter((c) => c?.error)
          .slice(0, 3)
          .map((c) => `${c?._id}: ${JSON.stringify(c?.error)}`);
        throw new Error(`[hunt-watch] seeding ${phase} failed: ${failed.join('; ')}`);
      }
    }
    return plan;
  }
}
