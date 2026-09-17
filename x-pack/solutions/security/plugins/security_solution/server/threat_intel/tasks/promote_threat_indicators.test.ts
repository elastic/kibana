/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the Promote threat indicators bulk-op builder.
 *
 * These tests verify the SHAPE of the scripted upsert operations produced by
 * `buildBulkOps` — that is, whether the script params and upsert doc are
 * structured correctly for the ES scripted-upsert API. They do NOT execute the
 * Painless script (which requires a live ES). Live-ES validation of sources[]
 * Painless script validation requires a live ES cluster (integration tests).
 *
 * Approach: we export `buildBulkOps` for testing via a named export added
 * below, keeping the function accessible without exposing it in the public
 * plugin contract.
 */

// Re-export the private function for testing only.
// We import the module and reach into its internals via a test-only export
// pattern: the function is already exported from the file as `buildBulkOps`
// after the refactor.
import { readFileSync } from 'fs';
import { join } from 'path';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

// The task-manager server entry pulls in the whole plugin graph, which this
// package's jest config cannot resolve (`TaskCost` comes back undefined). Only
// the symbols the task actually uses are needed here.
//
// The two throw helpers are tagged rather than aliased to a plain `throw`.
// Mocking both as an identical `throw err` is what let the recurring-task
// self-deletion bug ship: Task Manager DELETES a recurring task's saved object
// when a run throws an unrecoverable error, so which helper a branch reaches is
// the whole guarantee, and a test that cannot tell them apart proves nothing.
jest.mock('@kbn/task-manager-plugin/server', () => ({
  TaskCost: { Normal: 2 },
  throwRetryableError: (err: Error, runAt: Date) => {
    throw Object.assign(err, { __taskOutcome: 'retryable', __runAt: runAt });
  },
  throwUnrecoverableError: (err: Error) => {
    throw Object.assign(err, { __taskOutcome: 'unrecoverable' });
  },
}));

import { THREAT_REPORTS_INDEX_PATTERN } from '../../../common/threat_intel';
import {
  buildBulkOpsForTest,
  SOURCES_UPSERT_SCRIPT_FOR_TEST,
  PROMOTE_THREAT_INDICATORS_TASK_TYPE,
  registerPromoteThreatIndicatorsTask,
} from './promote_threat_indicators';

const NOW = '2024-06-01T00:00:00.000Z';
const EXTRACTED_AT = '2024-05-31T12:00:00.000Z';

/** Minimal ReportHit factory. */
const makeReport = ({
  id,
  iocs,
  sourceName = 'maltrail',
  sourceUrl = 'https://example.com/trail.txt',
  trailLabel,
  extractedAt = EXTRACTED_AT,
  spaceId = 'default',
}: {
  id: string;
  iocs: Array<{ type: string; value: string; reference?: string }>;
  sourceName?: string;
  sourceUrl?: string;
  trailLabel?: string;
  extractedAt?: string;
  spaceId?: string;
}) => ({
  _id: id,
  sort: [extractedAt, 0],
  _source: {
    '@timestamp': extractedAt,
    space_id: spaceId,
    source: { name: sourceName, url: sourceUrl },
    ...(trailLabel !== undefined ? { content: { title: trailLabel } } : {}),
    severity: { level: 'low' },
    // Only promotable tiers reach the index, so an IOC in a fixture that is not
    // about tiering needs one. Tier-specific cases pass it explicitly.
    extracted: { iocs: iocs.map((ioc) => ({ tier: 'discriminating', ...ioc })) },
    lineage: { extracted_at: extractedAt },
  },
});

describe('buildBulkOpsForTest — scripted upsert op shape', () => {
  describe('document id bounds and case sensitivity', () => {
    // A 512-byte id is the Elasticsearch limit. Over it the write fails at the
    // item level, which used to pin the sync checkpoint and stop promotion for
    // every space, so a single long URL in one report was a pipeline outage.
    it('hashes an over-long id instead of emitting one Elasticsearch will reject', () => {
      const longUrl = `https://evil.test/${'a'.repeat(900)}`;
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'url', value: longUrl }] })],
        NOW
      );

      expect(ops).toHaveLength(1);
      expect(Buffer.byteLength(ops[0]._id, 'utf8')).toBeLessThanOrEqual(512);
      expect(ops[0]._id).toMatch(/^default:url:[0-9a-f]{64}$/);
      // The readable value is still queryable, it just is not the id.
      const indicator = (ops[0].upsert.threat as { indicator: Record<string, unknown> }).indicator;
      expect((indicator.url as { full: string }).full).toBe(longUrl);
    });

    it('keeps the readable id for values that fit, so existing indicators are not re-keyed', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'domain', value: 'Evil.Example.COM' }] })],
        NOW
      );
      expect(ops[0]._id).toBe('default:domain:evil.example.com');
    });

    // URL path and query are case-sensitive. Folding them gave two distinct
    // indicators one id, and because the scripted update only appends
    // provenance, the second value never reached the document.
    it('preserves URL path case so two case-distinct URLs stay separate documents', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r1',
            iocs: [
              { type: 'url', value: 'https://evil.test/PAYLOAD/Stage2.exe' },
              { type: 'url', value: 'https://evil.test/payload/stage2.exe' },
            ],
          }),
        ],
        NOW
      );
      expect(ops).toHaveLength(2);
      expect(ops[0]._id).not.toBe(ops[1]._id);
    });

    it('still folds the scheme and host of a URL', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'url', value: 'HTTPS://EVIL.TEST/Path' }] })],
        NOW
      );
      expect(ops[0]._id).toBe('default:url:https://evil.test/Path');
    });

    // Base58 encodes information in case, so a wallet address must not be folded.
    it('preserves wallet address case', () => {
      const addr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'wallet', value: addr }] })],
        NOW
      );
      expect(ops[0]._id).toBe(`default:wallet:${addr}`);
    });
  });

  describe('malformed values', () => {
    // `threat.indicator.ip` is an `ip` field, so a non-address is a mapping
    // error, and a mapping error is permanent. One malformed extracted IOC must
    // not be able to cost the index its writes.
    it('drops an ip IOC whose value is not an address', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r1',
            iocs: [
              { type: 'ip', value: 'AABB1122' },
              { type: 'ip', value: '1.2.3.4' },
            ],
          }),
        ],
        NOW
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]._id).toBe('default:ip:1.2.3.4');
    });

    it('labels an IPv6 value ipv6-addr rather than ipv4-addr', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '2001:db8::1' }] })],
        NOW
      );
      const indicator = (ops[0].upsert.threat as { indicator: Record<string, unknown> }).indicator;
      expect(indicator.type).toBe('ipv6-addr');
      expect(indicator.ip).toBe('2001:db8::1');
    });
  });

  describe('single report, single IOC', () => {
    it('produces one update action + one scripted-upsert body per IOC', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '1.2.3.4' }] })],
        NOW
      );
      expect(ops).toHaveLength(1);
      const op = ops[0];
      // Stable, space-scoped _id
      expect(op._id).toBe('default:ip:1.2.3.4');
      expect((op.upsert as Record<string, unknown>).space_id).toBe('default');
      // Script present
      expect(op.scriptParams.report_id).toBe('r1');
      expect(op.scriptParams.now).toBe(NOW);
      // Upsert doc carries initial sources[] array with one entry
      const upsert = op.upsert as Record<string, unknown>;
      expect(Array.isArray(upsert.sources)).toBe(true);
      const sources = upsert.sources as Array<Record<string, unknown>>;
      expect(sources).toHaveLength(1);
      expect(sources[0].report_id).toBe('r1');
      expect(sources[0].first_seen).toBe(EXTRACTED_AT);
    });
  });

  describe('two reports citing the SAME IOC', () => {
    it('produces two separate ops (one per report×IOC) with distinct report_ids in scriptParams', () => {
      const reports = [
        makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '10.0.0.1' }] }),
        makeReport({ id: 'r2', iocs: [{ type: 'ip', value: '10.0.0.1' }] }),
      ];
      const ops = buildBulkOpsForTest(reports, NOW);

      // Two ops with the SAME indicator _id — one per citing report, same space.
      expect(ops).toHaveLength(2);
      expect(ops[0]._id).toBe('default:ip:10.0.0.1');
      expect(ops[1]._id).toBe('default:ip:10.0.0.1');

      // Different report_ids in scriptParams — when the Painless script runs,
      // each will append its own entry to sources[] on the live doc, resulting
      // in two entries (covered by integration tests).
      expect(ops[0].scriptParams.report_id).toBe('r1');
      expect(ops[1].scriptParams.report_id).toBe('r2');

      // Each upsert doc's sources[] carries only that report's entry (for the
      // first-time-seen path where the doc doesn't exist yet).
      const src0 = (ops[0].upsert as Record<string, unknown>).sources as Array<
        Record<string, unknown>
      >;
      const src1 = (ops[1].upsert as Record<string, unknown>).sources as Array<
        Record<string, unknown>
      >;
      expect(src0[0].report_id).toBe('r1');
      expect(src1[0].report_id).toBe('r2');
    });
  });

  describe('same report submitted twice (idempotency via Painless dedup)', () => {
    it('produces the same op twice — Painless guards against duplication on the live doc', () => {
      const report = makeReport({ id: 'r-same', iocs: [{ type: 'domain', value: 'evil.com' }] });
      const ops1 = buildBulkOpsForTest([report], NOW);
      const ops2 = buildBulkOpsForTest([report], NOW);

      // Op shape is identical — the Painless script (not buildBulkOps) enforces
      // dedup at write time by checking whether report_id is already in sources[].
      expect(ops1[0].scriptParams.report_id).toBe(ops2[0].scriptParams.report_id);
      expect(ops1[0]._id).toBe(ops2[0]._id);
    });
  });

  describe('maltrail report', () => {
    it('carries trail label + per-IOC reference in scriptParams when present', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-maltrail',
            iocs: [
              {
                type: 'ip',
                value: '5.6.7.8',
                reference: 'https://blog.example.com/malware-analysis',
              },
            ],
            sourceName: 'maltrail',
            sourceUrl:
              'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
            trailLabel: 'cobaltstrike',
          }),
        ],
        NOW
      );

      expect(ops).toHaveLength(1);
      const { scriptParams } = ops[0];
      expect(scriptParams.provider).toBe('maltrail');
      expect(scriptParams.trail).toBe('cobaltstrike');
      // Per-IOC reference wins over source.url
      expect(scriptParams.reference).toBe('https://blog.example.com/malware-analysis');
    });

    it('falls back to source.url when no per-IOC reference', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-maltrail-noref',
            iocs: [{ type: 'ip', value: '9.9.9.9' }],
            sourceName: 'maltrail',
            sourceUrl:
              'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
            trailLabel: 'cobaltstrike',
          }),
        ],
        NOW
      );

      expect(ops[0].scriptParams.reference).toBe(
        'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt'
      );
    });

    it('removes credentials from report and IOC provenance before promotion', () => {
      const [op] = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-credentialed',
            iocs: [
              {
                type: 'ip',
                value: '1.2.3.4',
                reference: 'https://ioc-user:ioc-password@references.example.com/report',
              },
            ],
            sourceUrl: 'https://feed-user:feed-password@feeds.example.com/source',
          }),
        ],
        NOW
      );

      expect(op.scriptParams.reference).toBe('https://references.example.com/report');
      expect(op.upsert.source_report_url).toBe('https://feeds.example.com/source');
      expect(op.upsert.sources).toEqual([
        expect.objectContaining({ reference: 'https://references.example.com/report' }),
      ]);
      expect(JSON.stringify(op)).not.toContain('password');
      expect(JSON.stringify(op)).not.toContain('user');
    });

    it('rejects unsupported references and falls back to sanitized source provenance', () => {
      const [op] = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-unsafe-reference',
            iocs: [{ type: 'ip', value: '1.2.3.4', reference: 'file:///etc/passwd' }],
            sourceUrl: 'https://feed-user:feed-password@feeds.example.com/source',
          }),
        ],
        NOW
      );

      expect(op.scriptParams.reference).toBe('https://feeds.example.com/source');
    });
  });

  describe('non-maltrail report (back-compat)', () => {
    it('produces a valid op with a single sources[] entry and no trail field', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-rss',
            iocs: [{ type: 'url', value: 'https://evil.example.com/payload' }],
            sourceName: 'rss-feed',
            sourceUrl: 'https://feeds.example.com/threat',
          }),
        ],
        NOW
      );

      expect(ops).toHaveLength(1);
      const { scriptParams, upsert } = ops[0];
      expect(scriptParams.trail).toBeNull();
      expect(scriptParams.provider).toBe('rss-feed');

      const sources = (upsert as Record<string, unknown>).sources as Array<Record<string, unknown>>;
      expect(sources).toHaveLength(1);
      expect(sources[0].trail).toBeUndefined();
      expect(sources[0].report_id).toBe('r-rss');
    });
  });

  describe('malformed IOCs are filtered', () => {
    it('skips IOCs with no value or unknown type', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({
            id: 'r-bad',
            iocs: [
              { type: 'ip', value: '' },
              { type: 'not_a_real_type', value: '1.2.3.4' },
              { type: 'ip', value: '1.2.3.4' },
            ],
          }),
        ],
        NOW
      );
      expect(ops).toHaveLength(1);
      expect(ops[0]._id).toBe('default:ip:1.2.3.4');
    });
  });

  describe('space isolation', () => {
    it('keys the same IOC value in different spaces as separate docs', () => {
      const ops = buildBulkOpsForTest(
        [
          makeReport({ id: 'r-a', iocs: [{ type: 'ip', value: '9.9.9.9' }], spaceId: 'team-a' }),
          makeReport({ id: 'r-b', iocs: [{ type: 'ip', value: '9.9.9.9' }], spaceId: 'team-b' }),
        ],
        NOW
      );

      // Same value, different spaces → two isolated _ids, so the scripted upsert
      // never merges sources[] across space boundaries.
      expect(ops.map((op) => op._id)).toEqual(['team-a:ip:9.9.9.9', 'team-b:ip:9.9.9.9']);
      expect((ops[0].upsert as Record<string, unknown>).space_id).toBe('team-a');
      expect((ops[1].upsert as Record<string, unknown>).space_id).toBe('team-b');
    });

    it('falls back to the global space when a report carries no space_id', () => {
      const report = makeReport({ id: 'r-global', iocs: [{ type: 'ip', value: '8.8.8.8' }] });
      // Simulate a legacy report written before space_id existed.
      delete (report._source as { space_id?: string }).space_id;

      const ops = buildBulkOpsForTest([report], NOW);

      expect(ops[0]._id).toBe('*:ip:8.8.8.8');
      expect((ops[0].upsert as Record<string, unknown>).space_id).toBe('*');
    });
  });
});

/**
 * The runner reads its cancellation signal straight off `RunContext`. It used to
 * destructure `abortController`, which `RunContext` does not provide, so the
 * first loop check threw `TypeError` and no indicator was ever promoted. These
 * tests drive the real runner so that regression cannot come back silently.
 */
describe('promote task runner', () => {
  const setupRunner = (searchResponses: Array<Record<string, unknown>>) => {
    const coreStart = coreMock.createStart();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    let call = 0;
    (esClient.search as jest.Mock).mockImplementation(async () => {
      const response = searchResponses[call] ?? { hits: { hits: [] } };
      call += 1;
      return response;
    });
    (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
    (esClient.openPointInTime as jest.Mock).mockResolvedValue({ id: 'pit-1' });
    (esClient.closePointInTime as jest.Mock).mockResolvedValue({ succeeded: true, num_freed: 1 });

    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([coreStart, {}, {}]);

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    const taskManager = {
      registerTaskDefinitions: jest.fn((defs) => Object.assign(definitions, defs)),
    } as unknown as TaskManagerSetupContract;

    registerPromoteThreatIndicatorsTask({
      taskManager,
      coreSetup,
      logger: loggingSystemMock.createLogger(),
      getReconcileAttributeWorkflows: jest.fn().mockResolvedValue(undefined),
    });

    const definition = definitions[PROMOTE_THREAT_INDICATORS_TASK_TYPE];
    return { definition, esClient };
  };

  /**
   * Built locally rather than via `taskManagerMock`: importing the mocks module
   * from here creates a require cycle that leaves `TaskCost` undefined.
   */
  const runContext = (overrides: Partial<RunContext> = {}): RunContext =>
    ({
      taskInstance: { state: {}, params: {} },
      signal: new AbortController().signal,
      executionUuid: 'test-execution-uuid',
      setCustomTaskRunEventFields: jest.fn(),
      ...overrides,
    } as unknown as RunContext);

  const reportHit = (id: string, extractedAt = EXTRACTED_AT) => ({
    _id: id,
    sort: [extractedAt, 1],
    _source: {
      source: { name: 'maltrail', url: 'https://example.com/trail.txt' },
      severity: { level: 'high' },
      // Needs a promotable tier: only `discriminating` and `contextual` reach the
      // index, so an untiered IOC produces no bulk operations at all.
      extracted: { iocs: [{ type: 'ip', value: '1.2.3.4', tier: 'discriminating' }] },
      lineage: { extracted_at: extractedAt },
    },
  });

  it('runs to completion and advances the cursor', async () => {
    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);

    const runner = definition.createTaskRunner(
      runContext({ taskInstance: { state: {}, params: {} } as never })
    );

    const result = await runner.run();

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(result.state).toEqual(
      expect.objectContaining({ lastSyncedAt: EXTRACTED_AT, totalReportsProcessed: 1 })
    );
  });

  it('holds the cursor when the run is aborted mid-scan', async () => {
    const controller = new AbortController();
    controller.abort();

    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);

    const runner = definition.createTaskRunner(
      runContext({
        taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never,
        signal: controller.signal,
      })
    );

    const result = await runner.run();

    // Never entered the loop, so nothing was written and the checkpoint stands.
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(result.state).toEqual(
      expect.objectContaining({ lastSyncedAt: 'now-30d', totalReportsProcessed: 0 })
    );
  });

  it('does not count bulk-rejected operations as written', async () => {
    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);
    (esClient.bulk as jest.Mock).mockResolvedValue({
      errors: true,
      items: [{ update: { error: { type: 'strict_dynamic_mapping_exception' } } }],
    });

    const runner = definition.createTaskRunner(
      runContext({ taskInstance: { state: {}, params: {} } as never })
    );

    const result = await runner.run();

    expect(result.state).toEqual(expect.objectContaining({ totalIndicatorsWritten: 0 }));
  });

  // Item-level failures used to be logged while the cursor advanced anyway, so
  // the affected reports were never promoted and nothing re-read that range.
  it('holds the cursor on a transient bulk rejection, so the range is re-scanned', async () => {
    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);
    (esClient.bulk as jest.Mock).mockResolvedValue({
      errors: true,
      items: [{ update: { status: 429, error: { type: 'es_rejected_execution_exception' } } }],
    });

    const runner = definition.createTaskRunner(
      runContext({ taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never })
    );

    const result = await runner.run();

    expect(result.state).toEqual(
      expect.objectContaining({ lastSyncedAt: 'now-30d', totalIndicatorsRejected: 0 })
    );
  });

  // The counterpart, and the reason the split exists. Holding the cursor for a
  // rejection that recurs on every run stops promotion for every space forever,
  // which is strictly worse than dropping the row that cannot be written.
  it('advances the cursor past a permanent bulk rejection and counts it', async () => {
    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);
    (esClient.bulk as jest.Mock).mockResolvedValue({
      errors: true,
      items: [
        {
          update: {
            _id: 'default:url:https://evil.test/a',
            status: 400,
            error: { type: 'illegal_argument_exception', reason: 'id is too long' },
          },
        },
      ],
    });

    const runner = definition.createTaskRunner(
      runContext({ taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never })
    );

    const result = await runner.run();

    expect(result.state).toEqual(
      expect.objectContaining({
        lastSyncedAt: '2024-05-31T12:00:00.000Z',
        totalIndicatorsWritten: 0,
        totalIndicatorsRejected: 1,
      })
    );
  });

  // A mapping conflict is permanent: the same document fails identically next
  // run, so it must not be able to pin the checkpoint.
  it('treats an unrecognised error type as permanent rather than retryable', async () => {
    const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);
    (esClient.bulk as jest.Mock).mockResolvedValue({
      errors: true,
      items: [{ update: { status: 400, error: { type: 'strict_dynamic_mapping_exception' } } }],
    });

    const runner = definition.createTaskRunner(
      runContext({ taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never })
    );

    const result = await runner.run();

    expect(result.state).toEqual(
      expect.objectContaining({
        lastSyncedAt: '2024-05-31T12:00:00.000Z',
        totalIndicatorsRejected: 1,
      })
    );
  });

  describe('point-in-time pagination', () => {
    it('opens a PIT over the reports pattern and searches through it', async () => {
      const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);

      await definition
        .createTaskRunner(runContext({ taskInstance: { state: {}, params: {} } as never }))
        .run();

      expect(esClient.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({ index: THREAT_REPORTS_INDEX_PATTERN })
      );

      // The PIT pins the indices, so the search must not also pass `index`.
      const searchArg = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchArg.pit).toEqual(expect.objectContaining({ id: 'pit-1' }));
      expect(searchArg.index).toBeUndefined();
      expect(searchArg.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { 'lineage.extracted_at': { gte: 'now-30d' } } }])
      );
      // `_shard_doc` is the stable tie-breaker a PIT makes available.
      expect(searchArg.sort).toEqual([
        { 'lineage.extracted_at': { order: 'asc' } },
        { _shard_doc: { order: 'asc' } },
      ]);
    });

    it('re-scans the last synced timestamp so same-stamp siblings are not skipped', async () => {
      const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);

      await definition
        .createTaskRunner(
          runContext({
            taskInstance: { state: { lastSyncedAt: EXTRACTED_AT }, params: {} } as never,
          })
        )
        .run();

      const searchArg = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchArg.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { 'lineage.extracted_at': { gte: EXTRACTED_AT } } }])
      );
    });

    it('closes the PIT when the scan completes', async () => {
      const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);

      await definition
        .createTaskRunner(runContext({ taskInstance: { state: {}, params: {} } as never }))
        .run();

      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    });

    it('closes the PIT even when the scan throws', async () => {
      const { definition, esClient } = setupRunner([]);
      (esClient.search as jest.Mock).mockRejectedValue(
        Object.assign(new Error('boom'), { statusCode: 500 })
      );

      await expect(
        definition
          .createTaskRunner(runContext({ taskInstance: { state: {}, params: {} } as never }))
          .run()
      ).rejects.toBeDefined();

      expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    });

    it('treats a missing reports index as a no-op', async () => {
      const { definition, esClient } = setupRunner([]);
      (esClient.openPointInTime as jest.Mock).mockRejectedValue(
        Object.assign(new Error('index_not_found'), { statusCode: 404 })
      );

      const result = await definition
        .createTaskRunner(
          runContext({ taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never })
        )
        .run();

      expect(result.state).toEqual(expect.objectContaining({ lastSyncedAt: 'now-30d' }));
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  /**
   * This task is recurring, and Task Manager DELETES a recurring task's saved
   * object when a run throws an unrecoverable error: `rescheduleFailedRun`
   * checks `isUnrecoverableError` before it looks at the schedule, and
   * `processResultForRecurringTask` then calls `removeTask()` (see Task
   * Manager's own test, "doesn't reschedule recurring tasks that throw an
   * unrecoverable error"). Nothing re-creates the task except
   * `startThreatIntel`, so any run that fails that way stops promotion for
   * every space until Kibana restarts.
   */
  describe('failing a run never unschedules the task', () => {
    const searchFailureOutcome = async (err: unknown) => {
      const { definition, esClient } = setupRunner([]);
      (esClient.search as jest.Mock).mockRejectedValue(err);

      return definition
        .createTaskRunner(runContext({ taskInstance: { state: {}, params: {} } as never }))
        .run()
        .then(
          () => undefined,
          (thrown: unknown) => thrown as { __taskOutcome?: string }
        );
    };

    // The mechanism, not just today's outcomes: any future branch that reaches
    // for the helper re-introduces the deletion.
    it('does not import throwUnrecoverableError', () => {
      const src = readFileSync(join(__dirname, 'promote_threat_indicators.ts'), 'utf8');
      const taskManagerImport = src.slice(
        0,
        src.indexOf("} from '@kbn/task-manager-plugin/server';")
      );

      expect(taskManagerImport).not.toContain('throwUnrecoverableError');
    });

    // These are exactly the errors the old `else` branch swallowed into
    // `throwUnrecoverableError`. A transport failure carries no `statusCode` at
    // all — only `ResponseError` has one — so it used to be indistinguishable
    // from a permanent one.
    it.each([
      ['a transport failure carrying no statusCode', new Error('socket hang up')],
      ['a 400', Object.assign(new Error('bad mapping'), { statusCode: 400 })],
      ['a 403', Object.assign(new Error('forbidden'), { statusCode: 403 })],
    ])('leaves the run rescheduled after %s', async (_label, err) => {
      await expect(searchFailureOutcome(err)).resolves.not.toHaveProperty(
        '__taskOutcome',
        'unrecoverable'
      );
    });

    // One retryable-status set for every request the task makes. 502 and 504
    // were retryable at the item level but permanent on the scan, which is the
    // drift that having three separate lists produced.
    it.each([[408], [429], [500], [502], [503], [504]])(
      'retries sooner after a transient %i from the report scan',
      async (statusCode) => {
        await expect(
          searchFailureOutcome(Object.assign(new Error('transient'), { statusCode }))
        ).resolves.toHaveProperty('__taskOutcome', 'retryable');
      }
    );
  });

  /**
   * The 2m task timeout aborts whatever request is in flight, and that rejection
   * also carries no `statusCode`. The `while (!signal.aborted)` check only
   * catches aborts that land between pages, so the request paths have to
   * recognise the abort themselves or a routine timeout becomes a run failure.
   */
  describe('task timeout mid-request', () => {
    const abortingRun = async (failing: 'search' | 'bulk') => {
      const controller = new AbortController();
      const { definition, esClient } = setupRunner([{ hits: { hits: [reportHit('r-1')] } }]);
      // What the abort actually looks like to the task: a rejection with no
      // status code, indistinguishable from a transport failure on its own.
      (esClient[failing] as jest.Mock).mockImplementation(async () => {
        controller.abort();
        throw new Error('Request aborted');
      });

      const result = await definition
        .createTaskRunner(
          runContext({
            taskInstance: { state: { lastSyncedAt: 'now-30d' }, params: {} } as never,
            signal: controller.signal,
          })
        )
        .run();

      return { result, esClient };
    };

    it.each([['search'], ['bulk']] as const)(
      'holds the cursor and returns state when the %s is aborted',
      async (failing) => {
        const { result } = await abortingRun(failing);

        expect(result.state).toEqual(expect.objectContaining({ lastSyncedAt: 'now-30d' }));
      }
    );

    it.each([['search'], ['bulk']] as const)(
      'still closes the PIT when the %s is aborted',
      async (failing) => {
        const { esClient } = await abortingRun(failing);

        expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
      }
    );
  });
});

/**
 * mvp-slice.md requires promote to vet IOCs before they reach the live
 * Indicator Match index: "confidence threshold, benign/common denylist, source
 * trust, citation-URL drop: specificity is not hostility". `extract_iocs`
 * encodes that verdict as the tier, so promote has to honour it.
 */
describe('vetting gate', () => {
  const iocAtTier = (value: string, tier?: string) => ({ type: 'ip', value, tier });

  it('drops denylisted and citation-only IOCs', () => {
    const ops = buildBulkOpsForTest(
      [
        makeReport({
          id: 'r-vet',
          iocs: [
            iocAtTier('1.1.1.1', 'discriminating'),
            iocAtTier('2.2.2.2', 'reference'),
            iocAtTier('3.3.3.3', 'denied'),
          ],
        }),
      ],
      NOW
    );

    expect(ops.map((op) => op._id)).toEqual(['default:ip:1.1.1.1']);
  });

  it('keeps contextual IOCs', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-vet', iocs: [iocAtTier('4.4.4.4', 'contextual')] })],
      NOW
    );

    expect(ops.map((op) => op._id)).toEqual(['default:ip:4.4.4.4']);
  });

  // Stored deliberately. The index is the full candidate set labelled by tier, and
  // consumers filter on `ioc_tier` for the precision they need, because a hunt
  // query and a blocking rule want opposite things.
  it('promotes uncertain IOCs and labels them', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-vet', iocs: [iocAtTier('5.5.5.5', 'uncertain')] })],
      NOW
    );

    expect(ops.map((op) => op._id)).toEqual(['default:ip:5.5.5.5']);
    expect(ops[0].upsert.ioc_tier).toBe('uncertain');
  });

  it.each([['reference'], ['denied']])('drops %s IOCs', (tier) => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-vet', iocs: [iocAtTier('9.9.9.9', tier)] })],
      NOW
    );

    expect(ops).toEqual([]);
  });

  // Unknown provenance is not a reason to treat a value as vetted, and the
  // promotable set feeds detection rules directly.
  it('drops IOCs with no tier at all', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-old', iocs: [iocAtTier('6.6.6.6', undefined)] })],
      NOW
    );

    expect(ops).toEqual([]);
  });

  it('records the tier that let the row through', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-vet', iocs: [iocAtTier('7.7.7.7', 'discriminating')] })],
      NOW
    );

    expect(ops[0].upsert).toEqual(expect.objectContaining({ ioc_tier: 'discriminating' }));
  });

  /**
   * The `upsert` document is ignored on an update, so a field that lives only
   * there is frozen at whatever the first citing report happened to say.
   * `ioc_tier` cannot afford that: it is the read-side filter on the per-space
   * alias, so a value first cited as `uncertain` stayed out of the precision
   * alias no matter how many later reports called it `discriminating`.
   */
  describe('tier refresh on re-citation', () => {
    it('passes the citing report tier to the script, not just to the upsert', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r-vet', iocs: [iocAtTier('8.8.8.8', 'contextual')] })],
        NOW
      );

      expect(ops[0].scriptParams.ioc_tier).toBe('contextual');
    });

    it('assigns ioc_tier in the script', () => {
      expect(SOURCES_UPSERT_SCRIPT_FOR_TEST).toContain('ctx._source.ioc_tier = params.ioc_tier');
    });

    it('only raises the label, so a later uncertain citation cannot demote it', () => {
      expect(SOURCES_UPSERT_SCRIPT_FOR_TEST).toContain('if (incomingTier > currentTier)');
    });

    // The rank map is generated from the same ordered list the membership gate
    // is built from, so a tier cannot be admitted by one and left unranked by
    // the other. Assert it through the gate rather than the list to prove they
    // agree.
    it.each([['uncertain'], ['contextual'], ['discriminating']])(
      'ranks the promotable tier %s in the script',
      (tier) => {
        const ops = buildBulkOpsForTest(
          [makeReport({ id: 'r-vet', iocs: [iocAtTier('4.3.2.1', tier)] })],
          NOW
        );

        expect(SOURCES_UPSERT_SCRIPT_FOR_TEST).toContain(`'${ops[0].scriptParams.ioc_tier}': `);
      }
    );
  });
});

describe('buildBulkOpsForTest — severity in scriptParams', () => {
  // The scripted upsert ignores the `upsert` document on an update, and the script
  // only touched last_seen, so an IOC first seen in a low-severity report stayed
  // `low` forever even after a critical report cited it.
  it('passes the citing report severity to the script', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '1.2.3.4' }] })],
      NOW
    );
    expect(ops[0].scriptParams.severity).toBe('low');
  });

  it('passes null when the report carries no severity', () => {
    const report = makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '1.2.3.4' }] });
    delete (report._source as { severity?: unknown }).severity;

    const ops = buildBulkOpsForTest([report], NOW);

    expect(ops[0].scriptParams.severity).toBeNull();
  });

  // The original bug was that the script never touched confidence at all: the
  // `upsert` document is ignored on an update, so severity was frozen at whatever
  // the first citing report happened to be. The max-severity comparison itself
  // needs a real cluster, so this only guards that the refresh is still wired.
  it('the script refreshes severity and confidence', () => {
    expect(SOURCES_UPSERT_SCRIPT_FOR_TEST).toContain('ctx._source.severity = params.severity');
    expect(SOURCES_UPSERT_SCRIPT_FOR_TEST).toContain(
      'ctx._source.threat.indicator.confidence = params.severity'
    );
  });
});
