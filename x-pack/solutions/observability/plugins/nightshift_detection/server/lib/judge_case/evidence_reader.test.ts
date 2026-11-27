/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { createEvidenceReader } from './evidence_reader';
import type { EvidenceResult } from './evidence_types';
import { runEvidence } from './run_evidence';

jest.mock('./run_evidence');

const runEvidenceMock = jest.mocked(runEvidence);
const FOUND: EvidenceResult = {
  result: 'found',
  rows: [{ n: 1 }],
  rows_truncated: false,
  cells_truncated: false,
};
const SKIPPED = { result: 'skipped', reason: 'query_cap' };

const esClient = elasticsearchServiceMock.createElasticsearchClient();

describe('createEvidenceReader', () => {
  beforeEach(() => {
    runEvidenceMock.mockReset();
    runEvidenceMock.mockResolvedValue(FOUND);
  });

  it('runs the query once with the abort signal and resolves its result', async () => {
    const abortSignal = new AbortController().signal;
    const reader = createEvidenceReader({ esClient, maxQueries: 5, abortSignal });

    expect(await reader.read('FROM a')).toEqual(FOUND);
    expect(runEvidenceMock).toHaveBeenCalledTimes(1);
    expect(runEvidenceMock).toHaveBeenCalledWith({ esClient, query: 'FROM a', abortSignal });
  });

  it('runs the same text once when read at the same time, and counts one slot', async () => {
    const reader = createEvidenceReader({ esClient, maxQueries: 5 });

    const [first, second] = await Promise.all([reader.read('FROM a'), reader.read('FROM a')]);

    expect(first).toBe(second);
    expect(runEvidenceMock).toHaveBeenCalledTimes(1);
    expect(reader.stats()).toEqual({ max_queries: 5, started: 1, skipped: 0 });
  });

  it('runs the same text once when read later, and keeps a failure without retrying', async () => {
    const failed: EvidenceResult = { result: 'error', reason: 'query_failed', message: 'bad' };
    runEvidenceMock.mockResolvedValue(failed);
    const reader = createEvidenceReader({ esClient });

    expect(await reader.read('FROM a')).toBe(failed);
    expect(await reader.read('FROM a')).toBe(failed);
    expect(runEvidenceMock).toHaveBeenCalledTimes(1);
  });

  it('treats text that differs in any character as another query', async () => {
    const reader = createEvidenceReader({ esClient });

    await reader.read('FROM a');
    await reader.read('FROM a ');

    expect(runEvidenceMock).toHaveBeenCalledTimes(2);
  });

  it('skips a distinct query past the cap without calling Elasticsearch, and keeps the skip', async () => {
    const reader = createEvidenceReader({ esClient, maxQueries: 1 });

    await reader.read('FROM a');
    expect(await reader.read('FROM b')).toEqual(SKIPPED);
    expect(await reader.read('FROM b')).toEqual(SKIPPED);
    expect(await reader.read('FROM a')).toEqual(FOUND);

    expect(runEvidenceMock).toHaveBeenCalledTimes(1);
    expect(reader.stats()).toEqual({ max_queries: 1, started: 1, skipped: 1 });
  });

  it('runs the first maxQueries of one tick in call order and skips the rest', async () => {
    const reader = createEvidenceReader({ esClient, maxQueries: 2 });

    const results = await Promise.all(['FROM a', 'FROM b', 'FROM c', 'FROM d'].map(reader.read));

    expect(results).toEqual([FOUND, FOUND, SKIPPED, SKIPPED]);
    expect(runEvidenceMock.mock.calls.map(([params]) => params.query)).toEqual([
      'FROM a',
      'FROM b',
    ]);
  });

  it('skips every query when the cap is 0', async () => {
    const reader = createEvidenceReader({ esClient, maxQueries: 0 });

    expect(await reader.read('FROM a')).toEqual(SKIPPED);
    expect(runEvidenceMock).not.toHaveBeenCalled();
    expect(reader.stats()).toEqual({ max_queries: 0, started: 0, skipped: 1 });
  });

  it.each([[-1], [1.5], [NaN], [Infinity]])('falls back to 40 for maxQueries %p', (maxQueries) => {
    expect(createEvidenceReader({ esClient, maxQueries }).stats().max_queries).toBe(40);
  });

  it('defaults the cap to 40', () => {
    expect(createEvidenceReader({ esClient }).stats()).toEqual({
      max_queries: 40,
      started: 0,
      skipped: 0,
    });
  });

  it('passes an aborted signal to runEvidence, which reports it as a result', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted: EvidenceResult = { result: 'error', reason: 'aborted', message: 'x' };
    runEvidenceMock.mockResolvedValue(aborted);
    const reader = createEvidenceReader({ esClient, abortSignal: controller.signal });

    expect(await reader.read('FROM a')).toBe(aborted);
    expect(runEvidenceMock.mock.calls[0][0].abortSignal?.aborted).toBe(true);
  });
});
