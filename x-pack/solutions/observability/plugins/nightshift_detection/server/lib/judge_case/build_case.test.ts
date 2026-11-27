/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { buildCase } from './build_case';
import { createEvidenceReader } from './evidence_reader';
import type { EvidenceReader } from './evidence_reader';
import type { ReadEvidenceResult } from './evidence_types';
import type {
  CaseAlert,
  CaseCandidate,
  CaseEvent,
  CaseMember,
  CaseSignal,
} from './judge_case_types';
import { runEvidence } from './run_evidence';

jest.mock('./run_evidence');

const runEvidenceMock = jest.mocked(runEvidence);

const FOUND: ReadEvidenceResult = {
  result: 'found',
  rows: [{ n: 1 }],
  rows_truncated: false,
  cells_truncated: false,
};

const signal = {
  group_hash: 'own',
  status: 'breached',
  data: { title: 'signal title', evidence_esql: 'FROM signal' },
} as unknown as CaseSignal;

const member = (hash: string, title = `member ${hash}`): CaseMember => ({
  group_hash: hash,
  title,
  evidence_esql: `FROM ${hash}`,
  entity: { type: 'service', name: hash },
  strategy: 'known_failures',
  unit: 'count',
  importance: 50,
});

const event = (id: string, members: CaseMember[], extra: Partial<CaseEvent> = {}): CaseEvent => ({
  id,
  title: `event ${id}`,
  summary: `summary ${id}`,
  status: 'open',
  members,
  ...extra,
});

const candidate = (ev: CaseEvent, reasons: string[] = ['same service']): CaseCandidate => ({
  event: ev,
  relation: 'same_entity',
  score: 0.9,
  reasons,
});

/** A reader that answers from a table, `found` by default, and records the order of reads. */
const fakeReader = (
  answers: Record<string, ReadEvidenceResult> = {}
): EvidenceReader & { reads: string[] } => {
  const reads: string[] = [];
  return {
    reads,
    read: (query: string) => {
      reads.push(query);
      return Promise.resolve(answers[query] ?? FOUND);
    },
    stats: () => ({ max_queries: 40, started: reads.length, skipped: 0 }),
  };
};

const base = { signal, alerts: [] as CaseAlert[], notes: [] as string[] };

describe('buildCase', () => {
  beforeEach(() => {
    runEvidenceMock.mockReset();
    runEvidenceMock.mockResolvedValue({
      result: 'found',
      rows: [{ n: 1 }],
      rows_truncated: false,
      cells_truncated: false,
    });
  });

  it('new_event holds the signal and E1 only', async () => {
    const reader = fakeReader();

    const result = await buildCase({ ...base, kind: 'new_event', reader });

    expect(result.kind).toBe('new_event');
    expect(result.signal).toBe(signal);
    expect(result.candidates).toEqual([]);
    expect(result.evidence).toEqual([
      { id: 'E1', title: 'signal title', query: 'FROM signal', ...FOUND },
    ]);
    expect(result.skipped_evidence).toEqual({ query_cap: 0, case_budget: 0 });
    expect(result.budget).toMatchObject({ max_chars: 60_000, trimmed: false, over_budget: false });
  });

  it('join numbers up to 2 members per candidate E2 to En and skips the signal own member', async () => {
    const reader = fakeReader();
    const first = event('ev1', [member('a'), member('own'), member('b'), member('c')]);
    const second = event('ev2', [member('d'), member('e'), member('f')]);

    const result = await buildCase({
      ...base,
      kind: 'join',
      reader,
      candidates: [candidate(first), candidate(second)],
    });

    expect(result.evidence.map(({ id }) => id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5']);
    expect(reader.reads).toEqual(['FROM signal', 'FROM a', 'FROM b', 'FROM d', 'FROM e']);
    expect(
      result.candidates.map(({ event: { members } }) => members.map((m) => m.evidence_id))
    ).toEqual([
      ['E2', 'E3'],
      ['E4', 'E5'],
    ]);
    expect(result.candidates[0]).toMatchObject({
      relation: 'same_entity',
      score: 0.9,
      reasons: ['same service'],
    });
    expect(JSON.stringify(result.candidates)).not.toContain('evidence_esql');
    expect(result.omitted.members).toBe(2);
  });

  it('new_episode marks the closed event evidence earlier_episode and not E1', async () => {
    const reader = fakeReader();
    const closed = event('old', [member('a'), member('b'), member('c')]);

    const result = await buildCase({ ...base, kind: 'new_episode', reader, event: closed });

    expect(result.evidence.map(({ id, earlier_episode: earlier }) => [id, earlier])).toEqual([
      ['E1', undefined],
      ['E2', true],
      ['E3', true],
    ]);
    expect(result.closed_event?.members.map((m) => m.group_hash)).toEqual(['a', 'b']);
  });

  it('leaves extras out with omitted counts and cuts long strings at 1,000', async () => {
    const long = 'x'.repeat(1_500);
    const candidates = [1, 2, 3, 4, 5].map((n) =>
      candidate(
        event(`ev${n}`, [member(`m${n}`, long)], { summary: long, title: long }),
        Array.from({ length: 7 }, () => long)
      )
    );
    const alerts: CaseAlert[] = Array.from({ length: 12 }, (_, n) => ({
      id: `a${n}`,
      title: long,
      entity: 'svc',
    }));
    const notes = Array.from({ length: 13 }, () => long);

    const result = await buildCase({
      ...base,
      kind: 'join',
      reader: fakeReader(),
      candidates,
      alerts,
      notes,
    });

    expect(result.candidates).toHaveLength(3);
    expect(result.alerts).toHaveLength(10);
    expect(result.notes).toHaveLength(10);
    expect(result.candidates[0].reasons).toHaveLength(5);
    expect(result.omitted).toEqual({ candidates: 2, members: 0, reasons: 6, alerts: 2, notes: 3 });
    expect(result.notes[0]).toHaveLength(1_000);
    expect(result.alerts[0].title).toHaveLength(1_000);
    expect(result.candidates[0].reasons[0]).toHaveLength(1_000);
    expect(result.candidates[0].event.title).toHaveLength(1_000);
    expect(result.candidates[0].event.summary).toHaveLength(1_000);
    expect(result.candidates[0].event.members[0].title).toHaveLength(1_000);
    expect(result.evidence[1].title).toHaveLength(1_000);
  });

  it('keeps found, empty, error and skipped items with their status and never throws', async () => {
    const reader = fakeReader({
      'FROM a': { result: 'empty' },
      'FROM b': { result: 'error', reason: 'timeout', message: 'slow' },
      'FROM c': { result: 'skipped', reason: 'query_cap' },
    });
    const candidates = [
      candidate(event('ev', [member('a'), member('b')])),
      candidate(event('ev2', [member('c')])),
    ];

    const result = await buildCase({ ...base, kind: 'join', reader, candidates });

    expect(result.evidence.map((item) => item.result)).toEqual([
      'found',
      'empty',
      'error',
      'skipped',
    ]);
    expect(result.skipped_evidence).toEqual({ query_cap: 1, case_budget: 0 });
  });

  it('skips the last items when the cap falls inside the case, never E1 before a member', async () => {
    const reader = createEvidenceReader({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      maxQueries: 2,
    });
    const candidates = [candidate(event('ev', [member('a'), member('b')]))];

    const result = await buildCase({ ...base, kind: 'join', reader, candidates });

    expect(result.evidence.map((item) => item.result)).toEqual(['found', 'found', 'skipped']);
    expect(result.skipped_evidence.query_cap).toBe(1);
  });

  it('keeps E1 in the case, skipped for the cap, so a caller can defer it', async () => {
    const reader = createEvidenceReader({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      maxQueries: 0,
    });

    const result = await buildCase({ ...base, kind: 'new_event', reader });

    expect(result.evidence).toEqual([
      {
        id: 'E1',
        title: 'signal title',
        query: 'FROM signal',
        result: 'skipped',
        reason: 'query_cap',
      },
    ]);
    expect(result.skipped_evidence.query_cap).toBe(1);
  });

  it('does not run the signal evidence again when the reader already holds it', async () => {
    const reader = createEvidenceReader({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
    });
    await reader.read('FROM signal');

    await buildCase({ ...base, kind: 'new_event', reader });

    expect(runEvidenceMock).toHaveBeenCalledTimes(1);
  });

  it('trims to the budget and reports it', async () => {
    const rows = Array.from({ length: 5 }, (_, n) => ({ n, text: 'x'.repeat(100) }));
    const bigFound: ReadEvidenceResult = {
      result: 'found',
      rows,
      rows_truncated: false,
      cells_truncated: false,
    };
    const reader = fakeReader({ 'FROM a': bigFound, 'FROM b': bigFound });
    const candidates = [candidate(event('ev', [member('a'), member('b')]))];

    const result = await buildCase({ ...base, kind: 'join', reader, candidates, maxChars: 900 });

    expect(result.budget.trimmed).toBe(true);
    expect(result.budget.max_chars).toBe(900);
    expect(JSON.stringify(result).length).toBe(result.budget.used_chars);
    expect(result.skipped_evidence.case_budget).toBeGreaterThan(0);
  });
});
