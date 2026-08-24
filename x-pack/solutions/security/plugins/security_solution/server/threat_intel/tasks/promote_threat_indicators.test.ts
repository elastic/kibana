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
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

// The task-manager server entry pulls in the whole plugin graph, which this
// package's jest config cannot resolve (`TaskCost` comes back undefined). Only
// the three symbols the task actually uses are needed here.
jest.mock('@kbn/task-manager-plugin/server', () => ({
  TaskCost: { Normal: 2 },
  throwRetryableError: (err: Error) => {
    throw err;
  },
  throwUnrecoverableError: (err: Error) => {
    throw err;
  },
}));

import {
  buildBulkOpsForTest,
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
}: {
  id: string;
  iocs: Array<{ type: string; value: string; reference?: string }>;
  sourceName?: string;
  sourceUrl?: string;
  trailLabel?: string;
  extractedAt?: string;
}) => ({
  _id: id,
  sort: [extractedAt, 0],
  _source: {
    '@timestamp': extractedAt,
    source: { name: sourceName, url: sourceUrl },
    ...(trailLabel !== undefined ? { content: { title: trailLabel } } : {}),
    severity: { level: 'low' },
    extracted: { iocs },
    lineage: { extracted_at: extractedAt },
  },
});

describe('buildBulkOpsForTest — scripted upsert op shape', () => {
  describe('single report, single IOC', () => {
    it('produces one update action + one scripted-upsert body per IOC', () => {
      const ops = buildBulkOpsForTest(
        [makeReport({ id: 'r1', iocs: [{ type: 'ip', value: '1.2.3.4' }] })],
        NOW
      );
      expect(ops).toHaveLength(1);
      const op = ops[0];
      // Stable _id
      expect(op._id).toBe('ip:1.2.3.4');
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

      // Two ops with the SAME indicator _id — one per citing report.
      expect(ops).toHaveLength(2);
      expect(ops[0]._id).toBe('ip:10.0.0.1');
      expect(ops[1]._id).toBe('ip:10.0.0.1');

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
      expect(ops[0]._id).toBe('ip:1.2.3.4');
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
    const esClient = coreMock.createStart().elasticsearch.client.asInternalUser;
    let call = 0;
    (esClient.search as jest.Mock).mockImplementation(async () => {
      const response = searchResponses[call] ?? { hits: { hits: [] } };
      call += 1;
      return response;
    });
    (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });

    const coreStart = coreMock.createStart();
    coreStart.elasticsearch.client.asInternalUser = esClient;

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
      extracted: { iocs: [{ type: 'ip', value: '1.2.3.4' }] },
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

    expect(ops.map((op) => op._id)).toEqual(['ip:1.1.1.1']);
  });

  it('keeps contextual and uncertain IOCs', () => {
    const ops = buildBulkOpsForTest(
      [
        makeReport({
          id: 'r-vet',
          iocs: [iocAtTier('4.4.4.4', 'contextual'), iocAtTier('5.5.5.5', 'uncertain')],
        }),
      ],
      NOW
    );

    expect(ops.map((op) => op._id)).toEqual(['ip:4.4.4.4', 'ip:5.5.5.5']);
  });

  it('promotes IOCs written before tiering existed', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-old', iocs: [iocAtTier('6.6.6.6', undefined)] })],
      NOW
    );

    expect(ops.map((op) => op._id)).toEqual(['ip:6.6.6.6']);
  });

  it('records the tier that let the row through', () => {
    const ops = buildBulkOpsForTest(
      [makeReport({ id: 'r-vet', iocs: [iocAtTier('7.7.7.7', 'discriminating')] })],
      NOW
    );

    expect(ops[0].upsert).toEqual(expect.objectContaining({ ioc_tier: 'discriminating' }));
  });
});
