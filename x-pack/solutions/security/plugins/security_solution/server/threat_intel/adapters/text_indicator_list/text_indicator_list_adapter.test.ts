/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
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
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
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

/** Two interleaved blocks: block 0 has a social reference, block 1 has a candidate reference.
 *  1.2.3.4 appears in both blocks → within-file dedup test.
 *  Total nested: 3 IOCs + 2 refs = 5 (well under MAX_NESTED_PER_DOC). */
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

  it('populates content.external_references with classified social/candidate descriptions', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    const refs = report.content.external_references ?? [];
    expect(refs).toHaveLength(2);

    const twitterRef = refs.find((r) => r.url?.includes('twitter.com'));
    expect(twitterRef?.source_name).toBe('maltrail');
    expect(twitterRef?.description).toBe('social');

    const blogRef = refs.find((r) => r.url?.includes('malwareanalysis'));
    expect(blogRef?.source_name).toBe('maltrail');
    expect(blogRef?.description).toBe('candidate');
  });

  it('deduplicates external_references by url', async () => {
    const blocksWithDupRef: IndicatorBlock[] = [
      {
        block_index: 0,
        reference: 'https://example.com/post',
        reference_class: 'candidate',
        iocs: [makeIoc('1.1.1.1')],
      },
      {
        block_index: 1,
        reference: 'https://example.com/post',
        reference_class: 'candidate',
        iocs: [makeIoc('2.2.2.2')],
      },
    ];
    parseIndicatorListMock.mockReturnValue(blocksWithDupRef);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/mytrail.txt'),
      makeContext(fetchMock)
    );

    // Both blocks share the same reference URL — dedup means both IOCs survive but
    // in this case they may end up in separate chunks or the same chunk. The key
    // invariant is: external_references entries for the same URL are NOT duplicated
    // within a single report doc (dedup-by-url within each chunk).
    const allRefs = reports.flatMap((r) => r.content.external_references ?? []);
    const urls = allRefs.map((r) => r.url);
    // Each chunk that contains IOCs from this reference should have exactly one ref entry for it.
    for (const report of reports) {
      const refsInDoc = report.content.external_references ?? [];
      const urlsInDoc = refsInDoc.map((r) => r.url);
      const uniqueUrlsInDoc = new Set(urlsInDoc);
      expect(urlsInDoc).toHaveLength(uniqueUrlsInDoc.size);
    }
    expect(urls.every((u) => u === 'https://example.com/post')).toBe(true);
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
    const halfCap = Math.floor((MAX_NESTED_PER_DOC - 1) / 2); // leave 1 slot for ref entry
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

    // Each block is ~ halfCap + 1 nested. Two blocks can fit together only if 2*(halfCap+1) ≤ MAX.
    // 2*(halfCap+1) = 2*halfCap + 2 ≈ MAX-1+2 = MAX+1 > MAX. So each goes in its own chunk.
    expect(reports.length).toBeGreaterThanOrEqual(2);

    // Block integrity: every IOC from block 0 appears in exactly one report.
    const allIocValues = reports.flatMap((r) => (r.extracted?.iocs ?? []).map((i) => i.value));
    const block0Values = blocks[0].iocs.map((i) => i.value);
    for (const v of block0Values) {
      expect(allIocValues.filter((x) => x === v)).toHaveLength(1);
    }

    // Total nested per doc ≤ MAX_NESTED_PER_DOC.
    for (const report of reports) {
      const iocCount = report.extracted?.iocs?.length ?? 0;
      const refCount = report.content.external_references?.length ?? 0;
      expect(iocCount + refCount).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
    }
  });

  it('chunking: each chunk gets a unique content_fingerprint', async () => {
    const halfCap = Math.floor((MAX_NESTED_PER_DOC - 1) / 2);
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

  it('chunking: single oversized reference splits into fragment docs with correct ref_part/ref_part_count', async () => {
    // One block with MAX_NESTED_PER_DOC * 2 IOCs → must split across ≥3 docs.
    const bigCount = MAX_NESTED_PER_DOC * 2;
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

    // All reports reference the same URL with ascending ref_part.
    const refEntries = reports.flatMap((r) => r.content.external_references ?? []);
    const forRef = refEntries.filter((e) => e.url === ref);
    expect(forRef).toHaveLength(reports.length); // each doc carries exactly one entry for this ref

    const partCount = forRef[0].ref_part_count!;
    expect(partCount).toBe(reports.length);

    const parts = forRef.map((e) => e.ref_part!).sort((a, b) => a - b);
    expect(parts).toEqual(Array.from({ length: partCount }, (_, i) => i + 1));

    // Total nested per doc ≤ MAX.
    for (const report of reports) {
      const total =
        (report.extracted?.iocs?.length ?? 0) + (report.content.external_references?.length ?? 0);
      expect(total).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
    }
  });

  it('chunking: unsplit reference always carries ref_part=1 and ref_part_count=1', async () => {
    parseIndicatorListMock.mockReturnValue(BLOCKS_FIXTURE);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const [report] = await textIndicatorListAdapter.run(
      makeSource(TRAIL_URL),
      makeContext(fetchMock)
    );

    const refs = report.content.external_references ?? [];
    expect(refs).toHaveLength(2);
    for (const ref of refs) {
      expect(ref.ref_part).toBe(1);
      expect(ref.ref_part_count).toBe(1);
    }
  });

  it('chunking: doc carrying tail of R and head of S has both m/n correct independently', async () => {
    // R has MAX_NESTED_PER_DOC - 1 IOCs (fills exactly one chunk, ref uses 1 slot).
    // S has 2 IOCs. Because R fills chunk 0 exactly, S goes into chunk 1.
    // But if R is split 2-ways: first fragment fills chunk 0, second fragment (+S) goes in chunk 1.
    // Let's force a split: R = MAX_NESTED_PER_DOC IOCs (needs split since MAX+1 ref slot > MAX).
    const rCount = MAX_NESTED_PER_DOC; // forces split into 2 fragments
    const refR = 'https://ref-r.example.com/';
    const refS = 'https://ref-s.example.com/';

    const blocks: IndicatorBlock[] = [
      {
        block_index: 0,
        reference: refR,
        reference_class: 'candidate',
        iocs: Array.from({ length: rCount }, (_, i) =>
          makeIoc(`10.1.${Math.floor(i / 256)}.${i % 256}`)
        ),
      },
      {
        block_index: 1,
        reference: refS,
        reference_class: 'candidate',
        iocs: [makeIoc('10.2.0.1'), makeIoc('10.2.0.2')],
      },
    ];
    parseIndicatorListMock.mockReturnValue(blocks);
    const fetchMock = jest.fn().mockResolvedValue(okResponse());

    const reports = await textIndicatorListAdapter.run(
      makeSource('https://example.com/trail/mixed.txt'),
      makeContext(fetchMock)
    );

    // R is split across ≥2 docs. S goes in the last doc (tail of R's last fragment + S).
    const rEntries = reports
      .flatMap((r) => r.content.external_references ?? [])
      .filter((e) => e.url === refR);
    const sEntries = reports
      .flatMap((r) => r.content.external_references ?? [])
      .filter((e) => e.url === refS);

    const rPartCount = rEntries[0].ref_part_count!;
    expect(rPartCount).toBeGreaterThan(1);
    const rParts = rEntries.map((e) => e.ref_part!).sort((a, b) => a - b);
    expect(rParts).toEqual(Array.from({ length: rPartCount }, (_, i) => i + 1));

    // S is unsplit: 1/1.
    expect(sEntries).toHaveLength(1);
    expect(sEntries[0].ref_part).toBe(1);
    expect(sEntries[0].ref_part_count).toBe(1);

    // The doc that contains S may also contain the last fragment of R — verify m/n independent.
    const docWithS = reports.find((r) =>
      (r.content.external_references ?? []).some((e) => e.url === refS)
    )!;
    const docSRefs = docWithS.content.external_references ?? [];
    const rEntryInDocS = docSRefs.find((e) => e.url === refR);
    if (rEntryInDocS) {
      // The last R fragment in this doc should have ref_part = rPartCount.
      expect(rEntryInDocS.ref_part).toBe(rPartCount);
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
      const total =
        (report.extracted?.iocs?.length ?? 0) + (report.content.external_references?.length ?? 0);
      expect(total).toBeLessThanOrEqual(MAX_NESTED_PER_DOC);
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
