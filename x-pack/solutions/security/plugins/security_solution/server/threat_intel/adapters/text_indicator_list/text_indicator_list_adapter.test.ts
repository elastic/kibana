/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { textIndicatorListAdapter } from './text_indicator_list_adapter';
import { parseIndicatorList } from './parse_indicator_list';
import { normalizedReportSchema } from '../../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import type { AdapterRunContext, SourceHit } from '../types';
import type { IndicatorBlock } from './parse_indicator_list';
import type { IocType } from '../../../../common/threat_intel';
import type { ExtractedIoc } from '../../services/extract_iocs';

jest.mock('./parse_indicator_list');
const parseIndicatorListMock = parseIndicatorList as jest.MockedFunction<typeof parseIndicatorList>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2024-01-15T12:00:00.000Z');
const TRAIL_URL =
  'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt';

// Exposed for chunking tests — must match adapter constant.
const MAX_NESTED_PER_DOC = 5000;

const makeContext = (
  fetchImpl: jest.Mock<Promise<Response>, [string | URL | Request, RequestInit?]>
): AdapterRunContext => ({
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  now: () => FIXED_NOW,
  fetchFn: fetchImpl as unknown as typeof fetch,
  lookupFn: async () => [{ address: '93.184.216.34' }],
});

const okResponse = () =>
  new Response('body-content', {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/plain' },
  });

const makeSource = (url: string, id = 'src-1', name = 'maltrail'): SourceHit => ({
  _id: id,
  _source: {
    adapter_type: 'text_indicator_list',
    name,
    config: { url },
    enabled: true,
  },
});

const makeIoc = (value: string, type: IocType = 'ip'): ExtractedIoc => ({
  type,
  value,
  tier: 'discriminating' as const,
  tier_heuristic: 'discriminating',
  tier_basis: 'maltrail_indicator_list',
});

/** Two interleaved blocks. 1.2.3.4 appears in both, so first-block attribution wins. */
const BLOCKS_FIXTURE: IndicatorBlock[] = [
  {
    block_index: 0,
    reference: 'https://twitter.com/malware_traffic/status/12345',
    reference_class: 'social',
    iocs: [makeIoc('1.2.3.4'), makeIoc('5.6.7.8')],
  },
  {
    block_index: 1,
    reference: 'https://blog.malwareanalysis.io/cobaltstrike-2024',
    reference_class: 'candidate',
    iocs: [makeIoc('9.10.11.12'), makeIoc('1.2.3.4')],
  },
];

/** Build N unique IOC entries for a block. */
const makeIocBlock = (blockIndex: number, count: number, reference?: string): IndicatorBlock => ({
  block_index: blockIndex,
  reference,
  reference_class: reference ? 'candidate' : undefined,
  iocs: Array.from({ length: count }, (_, i) => makeIoc(`10.0.${blockIndex}.${i}`)),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('textIndicatorListAdapter', () => {
  beforeEach(() => {
    parseIndicatorListMock.mockReset();
  });

  // -------------------------------------------------------------------------
  // Existing behaviour (small fixture — all fits in one chunk)
  // -------------------------------------------------------------------------

  it('produces one report from a valid Maltrail body', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    expect(reports).toHaveLength(1);
    expect(() => normalizedReportSchema.parse(reports[0])).not.toThrow();
  });

  it('sets extraction_method to text_indicator_list and stamps extracted_at', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    expect(report.lineage.extraction_method).toBe('text_indicator_list');
    expect(report.lineage.extracted_at).toBe('2024-01-15T12:00:00.000Z');
    expect(report.lineage.ingested_at).toBe('2024-01-15T12:00:00.000Z');
  });

  it('derives the trail label from the URL filename stem', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    expect(report.content.title).toBe('cobaltstrike');
    expect(report.lineage.source_doc_ref?.id).toBe('cobaltstrike');
    expect(report.content.body_text).toContain('cobaltstrike');
  });

  it('populates extracted.iocs with reference and block_index from the block', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    const iocs = report.extracted?.iocs ?? [];

    // 1.2.3.4 appears in block 0 and block 1 — dedup keeps block 0 entry
    const ioc124 = iocs.find((i) => i.value === '1.2.3.4');
    expect(ioc124).toBeDefined();
    expect(ioc124?.block_index).toBe(0);
    expect(ioc124?.reference).toContain('twitter.com');

    // 9.10.11.12 belongs to block 1
    const ioc9 = iocs.find((i) => i.value === '9.10.11.12');
    expect(ioc9).toBeDefined();
    expect(ioc9?.block_index).toBe(1);
    expect(ioc9?.reference).toContain('malwareanalysis');
  });

  it('deduplicates IOCs by (type, value) — first block attribution wins', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    const values = (report.extracted?.iocs ?? []).map((i) => i.value);
    expect(values.filter((v) => v === '1.2.3.4')).toHaveLength(1);
    expect(values).toHaveLength(3);
  });

  it('returns [] when the parser produces 0 blocks', async () => {
    parseIndicatorListMock.mockReturnValue([]);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/empty.txt'),
      makeContext(fetchMock)
    );

    expect(reports).toHaveLength(0);
  });

  it('returns [] when blocks have 0 parseable IOCs', async () => {
    const emptyIocBlocks: IndicatorBlock[] = [
      {
        block_index: 0,
        reference: 'https://example.com',
        reference_class: 'candidate',
        iocs: [],
      },
    ];
    parseIndicatorListMock.mockReturnValue(emptyIocBlocks);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/noiocs.txt'),
      makeContext(fetchMock)
    );

    expect(reports).toHaveLength(0);
  });

  it('throws on HTTP 4xx', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' }));

    await expect(
      textIndicatorListAdapter.run(
        makeSource('https://example.com/trail/missing.txt'),
        makeContext(fetchMock)
      )
    ).rejects.toThrow(/HTTP 404/);
  });

  it('returns [] when config.url is missing', async () => {
    const source: SourceHit = {
      _id: 'src-no-url',
      _source: { adapter_type: 'text_indicator_list', name: 'maltrail', config: {} },
    };
    const fetchMock = jest.fn();

    const reports = await textIndicatorListAdapter.run(source, makeContext(fetchMock));
    expect(reports).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('back-compat: normalizedReportSchema still parses a pending (pre-existing) report', () => {
    const oldReport = {
      '@timestamp': '2024-01-01T00:00:00.000Z',
      content_fingerprint: 'abc123',
      space_id: '*',
      source: { type: 'rss', name: 'Test', url: 'https://example.com', adapter_id: 'rss:1' },
      content: { title: 'Test', body_text: 'body', language: 'en' },
      severity: { level: 'medium', score: 40 },
      lineage: {
        ingested_at: '2024-01-01T00:00:00.000Z',
        extraction_method: 'pending',
      },
    };
    expect(() => normalizedReportSchema.parse(oldReport)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Chunking tests
  // -------------------------------------------------------------------------

  it('chunking: trail with multiple blocks splits into N reports at block boundaries', async () => {
    // Three blocks. Each has (MAX_NESTED_PER_DOC / 2) IOCs + 1 ref = just over half capacity.
    // So block 0 fills one chunk; block 1 can't join it; block 2 fills another chunk; etc.
    const halfCap = Math.floor(MAX_NESTED_PER_DOC / 2) + 1;
    const blocks: IndicatorBlock[] = [
      makeIocBlock(0, halfCap, 'https://ref0.example.com/post'),
      makeIocBlock(1, halfCap, 'https://ref1.example.com/post'),
      makeIocBlock(2, halfCap, 'https://ref2.example.com/post'),
    ];
    parseIndicatorListMock.mockReturnValue(blocks);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/big.txt'),
      makeContext(fetchMock)
    );

    // Two blocks exceed the per-document IOC limit, so at least two reports are required.
    expect(reports.length).toBeGreaterThanOrEqual(2);

    // Block integrity: every IOC from block 0 appears in exactly one report.
    const allIocValues = reports.flatMap((r) => (r.extracted?.iocs ?? []).map((i) => i.value));
    const block0Values = blocks[0].iocs.map((i) => i.value);
    for (const v of block0Values) {
      expect(allIocValues.filter((x) => x === v)).toHaveLength(1);
    }

    // Total nested IOCs per document stays bounded.
    for (const report of reports) {
      const iocCount = report.extracted?.iocs?.length ?? 0;
      expect(iocCount).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
    }
  });

  it('chunking: each chunk gets a unique content_fingerprint', async () => {
    const halfCap = Math.floor(MAX_NESTED_PER_DOC / 2) + 1;
    const blocks: IndicatorBlock[] = [
      makeIocBlock(0, halfCap, 'https://ref0.example.com/'),
      makeIocBlock(1, halfCap, 'https://ref1.example.com/'),
      makeIocBlock(2, halfCap, 'https://ref2.example.com/'),
    ];
    parseIndicatorListMock.mockReturnValue(blocks);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/big.txt'),
      makeContext(fetchMock)
    );

    expect(reports.length).toBeGreaterThan(1);
    const fps = reports.map((r) => r.content_fingerprint);
    expect(new Set(fps).size).toBe(fps.length);
  });

  it('chunking: a single oversized block splits without losing IOC references', async () => {
    const bigCount = MAX_NESTED_PER_DOC * 2 + 1;
    const ref = 'https://big-ref.example.com/post';
    const blocks: IndicatorBlock[] = [
      {
        block_index: 0,
        reference: ref,
        reference_class: 'candidate',
        iocs: Array.from({ length: bigCount }, (_, i) =>
          makeIoc(`192.168.${Math.floor(i / 256)}.${i % 256}`)
        ),
      },
    ];
    parseIndicatorListMock.mockReturnValue(blocks);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/huge.txt'),
      makeContext(fetchMock)
    );

    expect(reports.length).toBeGreaterThanOrEqual(3);

    const emittedIocs = reports.flatMap((report) => report.extracted?.iocs ?? []);
    expect(emittedIocs).toHaveLength(bigCount);
    expect(emittedIocs.every(({ reference }) => reference === ref)).toBe(true);
    for (const report of reports) {
      expect(report.extracted?.iocs?.length ?? 0).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
    }
  });

  it('chunking: total nested per emitted doc never exceeds MAX_NESTED_PER_DOC', async () => {
    // Mix: a big block (forces split) + several small blocks to test boundary arithmetic.
    const bigBlock = makeIocBlock(0, MAX_NESTED_PER_DOC * 3, 'https://big.example.com/');
    const smallBlocks = Array.from({ length: 5 }, (_, i) =>
      makeIocBlock(i + 1, 100, `https://small${i}.example.com/`)
    );
    parseIndicatorListMock.mockReturnValue([bigBlock, ...smallBlocks]);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/mixed2.txt'),
      makeContext(fetchMock)
    );

    for (const report of reports) {
      expect(report.extracted?.iocs?.length ?? 0).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
    }
  });

  it('chunking: trail-wide dedup — IOC in 2 blocks appears in at most one chunk', async () => {
    const sharedIoc = makeIoc('1.1.1.1');
    const bigCount = Math.floor(MAX_NESTED_PER_DOC / 2);

    // Block 0 and block 1 each have bigCount unique IOCs plus the shared one.
    // They will be in separate chunks. The shared IOC must appear in only one of them.
    const block0Iocs = [
      ...Array.from({ length: bigCount }, (_, i) => makeIoc(`10.0.0.${i}`)),
      sharedIoc,
    ];
    const block1Iocs = [
      ...Array.from({ length: bigCount }, (_, i) => makeIoc(`10.1.0.${i}`)),
      { ...sharedIoc }, // same type:value, different object
    ];

    parseIndicatorListMock.mockReturnValue([
      {
        block_index: 0,
        reference: 'https://ref0.example.com/',
        reference_class: 'candidate',
        iocs: block0Iocs,
      },
      {
        block_index: 1,
        reference: 'https://ref1.example.com/',
        reference_class: 'candidate',
        iocs: block1Iocs,
      },
    ]);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/dedup.txt'),
      makeContext(fetchMock)
    );

    const allValues = reports.flatMap((r) => (r.extracted?.iocs ?? []).map((i) => i.value));
    expect(allValues.filter((v) => v === '1.1.1.1')).toHaveLength(1);
  });

  // The change signal used to be body length + first IOC + last IOC, so two
  // lists that held those three values but differed in the middle produced
  // identical fingerprints and the dedup gate skipped the update.
  describe('change signal', () => {
    const fingerprintsFor = async (iocValues: string[]) => {
      parseIndicatorListMock.mockReturnValue([
        {
          block_index: 0,
          reference: 'https://example.com/ref',
          reference_class: 'candidate',
          iocs: iocValues.map((v) => makeIoc(v)),
        },
      ]);
      const reports = await textIndicatorListAdapter.run(
        makeSource('https://example.com/trail/signal.txt'),
        makeContext(jest.fn().mockResolvedValue(okResponse()))
      );
      return reports.map((r) => r.content_fingerprint);
    };

    it('is stable when the list is unchanged', async () => {
      expect(await fingerprintsFor(['1.1.1.1', '2.2.2.2', '9.9.9.9'])).toEqual(
        await fingerprintsFor(['1.1.1.1', '2.2.2.2', '9.9.9.9'])
      );
    });

    it('changes when an interior indicator is replaced', async () => {
      // Same response body, same first and last IOC — only the middle differs.
      expect(await fingerprintsFor(['1.1.1.1', '2.2.2.2', '9.9.9.9'])).not.toEqual(
        await fingerprintsFor(['1.1.1.1', '3.3.3.3', '9.9.9.9'])
      );
    });

    it('changes when interior indicators are reordered', async () => {
      expect(await fingerprintsFor(['1.1.1.1', '2.2.2.2', '3.3.3.3', '9.9.9.9'])).not.toEqual(
        await fingerprintsFor(['1.1.1.1', '3.3.3.3', '2.2.2.2', '9.9.9.9'])
      );
    });
  });
});

// ── Attribution and credential handling ──────────────────────────────────────

describe('textIndicatorListAdapter — attribution and credentials', () => {
  const runWith = async (source: SourceHit) => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    return textIndicatorListAdapter.run(
      source,
      makeContext(jest.fn().mockResolvedValue(okResponse()))
    );
  };

  // The create API accepts arbitrary text-list sources, so hard-coding 'maltrail'
  // attributed every custom feed's reports, and every indicator promoted from
  // them, to maltrail.
  it('attributes reports to the configured source name', async () => {
    const reports = await runWith(
      makeSource('https://feeds.example/trails/custom.txt', 'src-9', 'Acme C2 list')
    );

    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0].source.name).toBe('Acme C2 list');
  });

  // The credential reached the stored source.url, which the promote task copies
  // onto the indicator document, so this leaked well past the logs.
  it('stores a credential-free source URL', async () => {
    const reports = await runWith(
      makeSource('https://feeduser:s3cret@feeds.example/trails/custom.txt')
    );

    expect(reports[0].source.url).toBe('https://feeds.example/trails/custom.txt');
    expect(JSON.stringify(reports[0])).not.toContain('s3cret');
  });

  it('keeps the credential out of the fetch failure message', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const failing = makeContext(
      jest
        .fn()
        .mockResolvedValue(new Response('nope', { status: 503, statusText: 'Service Unavailable' }))
    );

    await expect(
      textIndicatorListAdapter.run(
        makeSource('https://feeduser:s3cret@feeds.example/trails/custom.txt'),
        failing
      )
    ).rejects.toThrow(/^(?!.*s3cret).*text_indicator_list fetch/s);
  });
});
