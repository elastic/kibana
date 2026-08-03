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
 * accumulation and dedup semantics is covered in Slice 4's integration pass.
 *
 * Approach: we export `buildBulkOps` for testing via a named export added
 * below, keeping the function accessible without exposing it in the public
 * plugin contract.
 */

// Re-export the private function for testing only.
// We import the module and reach into its internals via a test-only export
// pattern: the function is already exported from the file as `buildBulkOps`
// after the refactor.
import { buildBulkOpsForTest } from './promote_threat_indicators';

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
      // in two entries (tested live in Slice 4).
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
