/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { SUMMARY_INDEX, ensureSummaryIndex, writeSummary } from '../../../lib/summary';
import type { SummaryDoc } from '../../../lib/summary';
import type { FetchFeedOutput } from '../../../../common/workflows/step_types/fetch_feed/fetch_feed_common';
import type { MatchOutput } from '../../../../common/workflows/step_types/match/match_common';
import { RUN_ID, buildContext, buildDeps } from '../test_helpers';
import { buildSummarizeStepDefinition } from './summarize_step';

jest.mock('../../../lib/summary', () => ({
  ...jest.requireActual('../../../lib/summary'),
  ensureSummaryIndex: jest.fn(),
  writeSummary: jest.fn(),
}));

const ensureMock = ensureSummaryIndex as jest.MockedFunction<typeof ensureSummaryIndex>;
const writeMock = writeSummary as jest.MockedFunction<typeof writeSummary>;

const fetched: FetchFeedOutput = {
  hosts: 3,
  pack_missing: false,
  feeds: [
    { release: 'ubuntu:noble', status: 'downloaded', hosts: 2, etag: '"u"' },
    { release: 'rhel:9', status: 'downloaded', hosts: 1, etag: '"r"' },
  ],
};

const matched = (overrides: Partial<MatchOutput> = {}): MatchOutput => ({
  hosts: 3,
  findings: 5,
  fixed: 1,
  aborted: false,
  pack_missing: false,
  releases: { 'ubuntu:noble': 'matched', 'rhel:9': 'matched' },
  failures: {},
  feed_provenance: {},
  ...overrides,
});

const run = async (input: unknown, signal?: AbortSignal, startedAt?: string | Date) => {
  const { deps, es } = buildDeps();
  const result = await buildSummarizeStepDefinition(deps).handler(
    buildContext(input, signal, startedAt)
  );
  return { result, es, doc: writeMock.mock.calls[0]?.[1] as SummaryDoc | undefined };
};

describe('native_vuln.summarize handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureMock.mockResolvedValue(undefined);
    writeMock.mockResolvedValue(undefined);
  });

  it('writes one summary document keyed by the execution id', async () => {
    const { result, es, doc } = await run({ fetch: fetched, match: matched() });

    expect(ensureMock).toHaveBeenCalledWith(es);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(doc).toEqual({
      '@timestamp': '2026-11-13T01:00:00.000Z',
      run_id: RUN_ID,
      started_at: '2026-11-13T00:00:00.000Z',
      finished_at: '2026-11-13T01:00:00.000Z',
      status: 'success',
      hosts_scanned: 3,
      findings_open: 5,
      findings_fixed: 1,
      feeds: [
        { release: 'ubuntu:noble', status: 'matched', etag: '"u"', error: undefined },
        { release: 'rhel:9', status: 'matched', etag: '"r"', error: undefined },
      ],
      failures: [],
    });
    expect(result).toEqual({ output: { run_id: RUN_ID, status: 'success', index: SUMMARY_INDEX } });
  });

  it('records the KEV outcome when the match step reports it', async () => {
    const { doc } = await run({
      fetch: fetched,
      match: matched({ kev: { status: 'ok', listed: 2 } }),
    });
    expect(doc?.kev).toEqual({ status: 'ok', listed: 2 });
  });

  it('records the knowledge counters when the match step reports them', async () => {
    const { doc } = await run({
      fetch: fetched,
      match: matched({ knowledge: { written: 661, unchanged: 0, failed: 2 } }),
    });
    expect(doc?.knowledge).toEqual({ written: 661, unchanged: 0, failed: 2 });
  });

  it('leaves knowledge out of the summary when the match step did not report it', async () => {
    const { doc } = await run({ fetch: fetched, match: matched() });
    expect(doc).not.toHaveProperty('knowledge');
  });

  it('leaves kev out of the summary when the match step did not report it', async () => {
    const { doc } = await run({ fetch: fetched, match: matched() });
    expect(doc).not.toHaveProperty('kev');
  });

  it('accepts a Date for the execution start', async () => {
    const { doc } = await run(
      { fetch: fetched, match: matched() },
      undefined,
      new Date('2026-11-12T23:00:00.000Z')
    );

    expect(doc?.started_at).toBe('2026-11-12T23:00:00.000Z');
  });

  it('marks a run partial and lists the failed release when a write failed', async () => {
    const { doc } = await run({
      fetch: fetched,
      match: matched({
        releases: { 'ubuntu:noble': 'failed', 'rhel:9': 'matched' },
        failures: { 'ubuntu:noble': 'bulk write rejected 3 documents' },
      }),
      match_error: 'Vulnerability scan failed for ubuntu:noble',
    });

    expect(doc?.status).toBe('partial');
    expect(doc?.failures).toEqual(['ubuntu:noble: bulk write rejected 3 documents']);
    expect(doc?.findings_open).toBe(5);
  });

  it('marks a run failed and reports the fetch outcome when the match step never reported', async () => {
    const { doc } = await run({
      fetch: {
        hosts: 2,
        pack_missing: false,
        feeds: [
          { release: 'ubuntu:noble', status: 'failed', hosts: 1, error: 'HTTP 503' },
          { release: 'rhel:10', status: 'unavailable', hosts: 1 },
        ],
      },
      match_error: 'Elasticsearch is unavailable',
    });

    expect(doc?.status).toBe('failed');
    expect(doc?.hosts_scanned).toBe(2);
    expect(doc?.feeds).toEqual([
      expect.objectContaining({ release: 'ubuntu:noble', status: 'failed', error: 'HTTP 503' }),
      expect.objectContaining({ release: 'rhel:10', status: 'unavailable', error: undefined }),
    ]);
    expect(doc?.failures).toEqual(['ubuntu:noble: HTTP 503']);
  });

  it('records an aborted run when the match step reports it', async () => {
    const controller = new AbortController();
    controller.abort();
    const { doc, result } = await run(
      { fetch: fetched, match: matched({ aborted: true, releases: {} }) },
      controller.signal
    );

    expect(doc?.status).toBe('aborted');
    expect(result).toEqual({ output: expect.objectContaining({ status: 'aborted' }) });
  });

  it('records an aborted run when only an abort error came back', async () => {
    const { doc } = await run({ fetch_error: 'The feed download was aborted' });

    expect(doc?.status).toBe('aborted');
    expect(doc?.failures).toEqual(['fetch: The feed download was aborted']);
  });

  it('records no_pack without failures', async () => {
    const { doc } = await run({
      fetch: { feeds: [], hosts: 0, pack_missing: true },
      match: matched({ hosts: 0, findings: 0, fixed: 0, pack_missing: true, releases: {} }),
    });

    expect(doc?.status).toBe('no_pack');
    expect(doc?.failures).toEqual([]);
  });

  it('truncates long failure messages', async () => {
    const { doc } = await run({
      match: matched({
        releases: { 'rhel:9': 'failed' },
        failures: { 'rhel:9': 'x'.repeat(5000) },
      }),
    });

    expect(doc?.failures[0].length).toBeLessThanOrEqual(2048);
  });

  it('fails the step when the summary cannot be written', async () => {
    writeMock.mockRejectedValue(new Error('index is read-only'));

    await expect(run({ fetch: fetched, match: matched() })).rejects.toThrow('index is read-only');
  });

  it.each(['basic', 'gold', 'platinum'])(
    'refuses on a %s licence and writes nothing',
    async (type) => {
      const { deps } = buildDeps({
        getLicense: async () => licenseMock.createLicense({ license: { type: type as never } }),
      });

      const result = await buildSummarizeStepDefinition(deps).handler(
        buildContext({ fetch: fetched, match: matched() })
      );

      expect(result.error?.message).toBe(
        'Native vulnerability scanning requires an Enterprise licence'
      );
      expect(writeMock).not.toHaveBeenCalled();
      expect(ensureMock).not.toHaveBeenCalled();
    }
  );

  it('writes the summary on a trial licence', async () => {
    const { deps } = buildDeps({
      getLicense: async () =>
        licenseMock.createLicense({ license: { type: 'trial', mode: 'trial' } }),
    });

    const result = await buildSummarizeStepDefinition(deps).handler(
      buildContext({ fetch: fetched, match: matched() })
    );

    expect(result.error).toBeUndefined();
    expect(writeMock).toHaveBeenCalledTimes(1);
  });
});
