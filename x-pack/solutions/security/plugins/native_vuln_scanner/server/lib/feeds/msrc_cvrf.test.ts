/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { downloadMsrcCvrf, downloadMsrcUpdatesIndex, isMsrcMonth, msrcCvrfUrl } from './fetch';
import { parseMsrcCvrf, parseMsrcUpdatesIndex, type MsrcCvrfResult } from './msrc_cvrf';

const fixture = (name: string): Buffer =>
  readFileSync(join(__dirname, '__fixtures__', 'msrc', name));

/** The bytes in `size` slices, as a network body arrives. */
async function* sliced(bytes: Uint8Array, size: number): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += size) {
    yield bytes.subarray(offset, offset + size);
  }
}

describe('document completeness scan', () => {
  // A BOM, an escaped quote followed by enough closing brackets to end the document early if the
  // quote were read as the end of the string, an escaped backslash, and multibyte text. Every
  // byte is fed alone, so each escape and each character straddles a slice boundary.
  const document = Buffer.from(
    '\ufeff' +
      JSON.stringify({
        ProductTree: { FullProductName: [] },
        Vulnerability: [
          { CVE: 'CVE-2026-1', Notes: 'a \\" }}}} ]]]] quote \\\\ }]{[ zażółć 日本語 \\\\\\"' },
        ],
        DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
      })
  );

  it('accepts a document fed one byte at a time', async () => {
    await expect(parseMsrcCvrf(sliced(document, 1))).resolves.toMatchObject({
      documentId: '2026-Jan',
    });
  });

  it('rejects the same document cut by one byte', async () => {
    await expect(parseMsrcCvrf(sliced(document.subarray(0, -1), 1))).rejects.toThrow('cut off');
  });
});

const rowFor = (result: MsrcCvrfResult, cve: string, productId: string) =>
  result.rows.filter((row) => row.cve === cve && row.productId === productId);

describe('parseMsrcCvrf', () => {
  describe('July 2026', () => {
    let result: MsrcCvrfResult;
    beforeAll(async () => {
      result = await parseMsrcCvrf(sliced(fixture('cvrf_2026-Jul_trimmed.json'), 4096));
    });

    it('reads the document id and release date', () => {
      expect(result.documentId).toBe('2026-Jul');
      expect(result.currentReleaseDate).toBe('2026-11-23T01:04:52');
    });

    it('reduces every vulnerability to advisory rows for Windows products only', () => {
      expect(result.cves).toHaveLength(8);
      expect(result.rows).toHaveLength(156);
      expect(result.products).toBe(29);
      // Windows 8.1/2012 `6.x` builds are dropped and counted.
      expect(result.skipped).toEqual({ remediation_other_build: 9 });
    });

    it('gives the fixed build, KB and hotpatch flag per product (spec §4 shape)', () => {
      expect(rowFor(result, 'CVE-2026-33842', '12097')).toEqual([
        {
          cve: 'CVE-2026-33842',
          productId: '12097',
          kb: '5099539',
          fixedBuild: '10.0.19045.7548',
          build: 19045,
          ubr: 7548,
          hotpatch: false,
          subType: 'Security Update',
          supersedes: ['5094127'],
        },
      ]);
      expect(rowFor(result, 'CVE-2026-33842', '11923')[0]).toMatchObject({
        kb: '5099540',
        fixedBuild: '10.0.20348.5386',
      });
      expect(rowFor(result, 'CVE-2026-33842', '12436')[0]).toMatchObject({
        kb: '5099536',
        fixedBuild: '10.0.26100.33158',
        ubr: 33158,
      });
    });

    it('keeps the KB a row supersedes (KB5099538 replaces KB5094123)', () => {
      expect(rowFor(result, 'CVE-2026-33842', '11571')[0]).toMatchObject({
        kb: '5099538',
        fixedBuild: '10.0.17763.9020',
        supersedes: ['5094123'],
      });
    });

    it('reads the title and a CVSS score for a CVE', () => {
      expect(result.cves.find((cve) => cve.id === 'CVE-2026-34328')).toEqual({
        id: 'CVE-2026-34328',
        title: 'Windows Audio Service Information Disclosure Vulnerability',
        cvss: {
          version: '3.1',
          score: 5.5,
          vector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N/E:U/RL:O/RC:C',
        },
      });
    });

    it('never emits a row for a product that is not Windows', () => {
      const windows = new Set(result.rows.map((row) => row.productId));
      expect([...windows].every((id) => /^\d+$/.test(id))).toBe(true);
      expect(windows.has('16787')).toBe(false);
      expect(result.rows.every((row) => /^10\.0\.\d+\.\d+$/.test(row.fixedBuild))).toBe(true);
    });
  });

  it('flags hotpatch updates and keeps them next to the cumulative update', async () => {
    const result = await parseMsrcCvrf(sliced(fixture('cvrf_2026-Nov_trimmed.json'), 8192));
    const rows = rowFor(result, 'CVE-2026-100223', '12390');
    expect(
      rows.map(({ kb, fixedBuild, hotpatch, subType }) => ({ kb, fixedBuild, hotpatch, subType }))
    ).toEqual([
      {
        kb: '5132061',
        fixedBuild: '10.0.26100.9974',
        hotpatch: false,
        subType: 'Security Update',
      },
      {
        kb: '5132043',
        fixedBuild: '10.0.26100.9911',
        hotpatch: true,
        subType: 'Security Hotpatch Update',
      },
    ]);
    expect(rowFor(result, 'CVE-2026-100223', '12436').map((r) => r.hotpatch)).toEqual([
      false,
      true,
    ]);
  });

  it('keeps a servicing stack update as a non-hotpatch row', async () => {
    const result = await parseMsrcCvrf(sliced(fixture('cvrf_2026-Nov_trimmed.json'), 8192));
    expect(rowFor(result, 'CVE-2026-119831', '10852')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kb: '5131083',
          fixedBuild: '10.0.14393.9681',
          hotpatch: false,
          subType: 'Servicing Stack Update',
        }),
      ])
    );
  });

  it.each(['Sep', 'Oct'])('parses the %s 2026 document', async (month) => {
    const result = await parseMsrcCvrf(sliced(fixture(`cvrf_2026-${month}_trimmed.json`), 5000));
    expect(result.documentId).toBe(`2026-${month}`);
    expect(result.rows.length).toBeGreaterThan(100);
  });

  it('gives the same rows whatever the chunk size, including one byte at a time near a split', async () => {
    const bytes = fixture('cvrf_2026-Oct_trimmed.json');
    const whole = await parseMsrcCvrf(bytes);
    const small = await parseMsrcCvrf(sliced(bytes, 977));
    expect(small.rows).toEqual(whole.rows);
    expect(small.cves).toEqual(whole.cves);
  });

  it('splits a supersedence list written with or without spaces', async () => {
    const document = {
      DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
      ProductTree: {
        FullProductName: [
          { ProductID: '12097', Value: 'Windows 10 Version 22H2 for x64-based Systems' },
        ],
      },
      Vulnerability: [
        {
          CVE: 'CVE-2026-0001',
          Remediations: [
            {
              Type: 2,
              ProductID: ['12097'],
              FixedBuild: '10.0.19045.1',
              Description: { Value: '5000001' },
              Supercedence: '5000002,5000003, 5000004',
            },
          ],
        },
      ],
    };
    const result = await parseMsrcCvrf(Buffer.from(JSON.stringify(document)));
    expect(result.rows[0].supersedes).toEqual(['5000002', '5000003', '5000004']);
    expect(result.cves[0].cvss).toBeUndefined();
  });

  it('reduces every vulnerability of a document that spans many batches and chunks', async () => {
    const count = 120;
    const document = {
      DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
      ProductTree: {
        FullProductName: [
          { ProductID: '12097', Value: 'Windows 10 Version 22H2 for x64-based Systems' },
          { ProductID: '11923', Value: 'Windows Server 2022' },
        ],
      },
      Vulnerability: Array.from({ length: count }, (_, index) => ({
        CVE: `CVE-2026-${String(index + 1).padStart(5, '0')}`,
        Title: { Value: `Windows Component ${index + 1} Elevation of Privilege Vulnerability` },
        CVSSScoreSets: [
          {
            BaseScore: '7.8',
            Vector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
            ProductID: ['12097', '11923'],
          },
        ],
        Remediations: [
          ...['12097', '11923'].flatMap((productId) =>
            [1, 2, 3].map((n) => ({
              Type: 2,
              ProductID: [productId],
              FixedBuild: `10.0.19045.${index + n}`,
              Description: { Value: `${5000000 + n}` },
              Supercedence: '5000000',
            }))
          ),
          { Type: 3, ProductID: ['12097'], Description: { Value: 'Known issue text' } },
        ],
      })),
    };
    const bytes = Buffer.from(JSON.stringify(document));
    for (const size of [512, 1024]) {
      const result = await parseMsrcCvrf(sliced(bytes, size));
      expect(result.skipped.vulnerability_missing_cve).toBeUndefined();
      expect(result.cves).toHaveLength(count);
      expect(result.rows).toHaveLength(count * 6);
      for (const [index, cve] of result.cves.entries()) {
        expect(cve.id).toBe(`CVE-2026-${String(index + 1).padStart(5, '0')}`);
        expect(cve.title).toBe(
          `Windows Component ${index + 1} Elevation of Privilege Vulnerability`
        );
        expect(cve.cvss?.score).toBe(7.8);
        expect(result.rows.filter((row) => row.cve === cve.id)).toHaveLength(6);
      }
    }
  });

  it('counts and drops rows with a bad KB or a Windows-less product list', async () => {
    const document = {
      DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
      ProductTree: {
        FullProductName: [
          { ProductID: '12097', Value: 'Windows 10 Version 22H2 for x64-based Systems' },
          { ProductID: '1', Value: 'Microsoft .NET 10.0' },
        ],
      },
      Vulnerability: [
        {
          CVE: 'CVE-2026-0002',
          Remediations: [
            { Type: 2, ProductID: ['1'], FixedBuild: '10.0.15', Description: { Value: 'x' } },
            { Type: 2, ProductID: ['1'], FixedBuild: '10.0.1.2', Description: { Value: '5' } },
            {
              Type: 2,
              ProductID: ['12097'],
              FixedBuild: '10.0.19045.1',
              Description: { Value: 'Release Notes' },
            },
            {
              Type: 3,
              ProductID: ['12097'],
              FixedBuild: '10.0.19045.1',
              Description: { Value: '5' },
            },
          ],
        },
        { CVE: 'not-a-cve', Remediations: [] },
      ],
    };
    const result = await parseMsrcCvrf(Buffer.from(JSON.stringify(document)));
    expect(result.rows).toEqual([]);
    expect(result.cves).toEqual([]);
    expect(result.skipped).toEqual({
      remediation_other_build: 1,
      remediation_not_windows: 1,
      remediation_bad_kb: 1,
      vulnerability_missing_cve: 1,
    });
  });

  describe('hard limits', () => {
    const bytes = fixture('cvrf_2026-Jul_trimmed.json');

    it('stops a source that is over the byte cap, and releases the source', async () => {
      const released = jest.fn();
      async function* source() {
        try {
          yield* sliced(bytes, 4096);
        } finally {
          released();
        }
      }
      await expect(parseMsrcCvrf(source(), { maxBytes: 20_000 })).rejects.toThrow(
        'MSRC CVRF is over 20000 bytes'
      );
      expect(released).toHaveBeenCalled();
    });

    it('accepts a source exactly at the cap', async () => {
      await expect(parseMsrcCvrf(bytes, { maxBytes: bytes.length })).resolves.toMatchObject({
        documentId: '2026-Jul',
      });
    });

    it('stops a source that stalls past the deadline', async () => {
      async function* stalls() {
        yield bytes.subarray(0, 1000);
        await new Promise<never>(() => undefined);
      }
      await expect(parseMsrcCvrf(stalls(), { timeoutMs: 50 })).rejects.toThrow(
        'MSRC CVRF parse exceeded 50 ms'
      );
    });

    it('stops when the caller aborts', async () => {
      const controller = new AbortController();
      async function* source() {
        yield bytes.subarray(0, 1000);
        controller.abort(new Error('scan cancelled'));
        await new Promise<never>(() => undefined);
      }
      await expect(parseMsrcCvrf(source(), { signal: controller.signal })).rejects.toThrow(
        'scan cancelled'
      );
    });

    it('rejects a document cut off before its closing bracket instead of returning part of it', async () => {
      const cut = bytes.subarray(0, Math.floor(bytes.length * 0.7));
      await expect(parseMsrcCvrf(sliced(cut, 4096))).rejects.toThrow('cut off');
    });

    it('rejects something that is not JSON, without a position dump', async () => {
      const error = await parseMsrcCvrf(Buffer.from('{"Vulnerability": nope}')).catch(
        (e: Error) => e
      );
      expect((error as Error).message).toMatch(/^MSRC CVRF is not valid JSON/);
      expect((error as Error).message).not.toContain('\n');
    });

    it.each([
      ['plain', '<?xml version="1.0"?><cvrfdoc/>'],
      ['after a BOM and whitespace', '\ufeff \r\n<cvrfdoc/>'],
    ])(
      'names the XML form of the document (%s) and the header that selects JSON',
      async (_n, body) => {
        const error = await parseMsrcCvrf(sliced(Buffer.from(body), 3)).catch((e: Error) => e);
        expect((error as Error).message).toMatch(/XML form.*Accept: application\/json/);
      }
    );

    it('rejects data after the closing bracket of the document with its own error', async () => {
      const complete = Buffer.from(
        JSON.stringify({
          ProductTree: { FullProductName: [] },
          Vulnerability: [],
          DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
        })
      );
      await expect(parseMsrcCvrf(complete)).resolves.toMatchObject({ documentId: '2026-Jan' });
      await expect(
        parseMsrcCvrf(Buffer.concat([complete, Buffer.from(' \n')]))
      ).resolves.toMatchObject({ documentId: '2026-Jan' });
      for (const trailing of ['x', '{}', ']']) {
        await expect(
          parseMsrcCvrf(sliced(Buffer.concat([complete, Buffer.from(`\n${trailing}`)]), 7))
        ).rejects.toThrow('unexpected data after the document');
      }
    });

    it('checks the deadline and abort between the slices of an in-memory body', async () => {
      const big = Buffer.concat([
        Buffer.from('{"ProductTree":{"FullProductName":[]},"Vulnerability":["'),
        Buffer.alloc(8 * 1024 * 1024, 0x78),
        Buffer.from('"]}'),
      ]);
      await expect(parseMsrcCvrf(big, { timeoutMs: 1 })).rejects.toThrow(
        'MSRC CVRF parse exceeded 1 ms'
      );
      const controller = new AbortController();
      controller.abort(new Error('scan cancelled'));
      await expect(parseMsrcCvrf(big, { signal: controller.signal })).rejects.toThrow(
        'scan cancelled'
      );
    });

    it('rejects an empty body and a document without tracking', async () => {
      await expect(parseMsrcCvrf(Buffer.alloc(0))).rejects.toThrow();
      await expect(parseMsrcCvrf(Buffer.from('{"Vulnerability":[]}'))).rejects.toThrow(
        'no DocumentTracking'
      );
    });

    it('rejects vulnerabilities that arrive before the product tree', async () => {
      const padding = 'x'.repeat(1000);
      const body = JSON.stringify({
        Vulnerability: Array.from({ length: 300 }, (_, index) => ({
          CVE: `CVE-2026-${index}`,
          Notes: padding,
        })),
        ProductTree: { FullProductName: [] },
        DocumentTracking: { Identification: { ID: { Value: '2026-Jan' } } },
      });
      await expect(parseMsrcCvrf(sliced(Buffer.from(body), 4096))).rejects.toThrow(
        'before its product tree'
      );
    });

    it('gives the same result for the same bytes however they are sliced', async () => {
      const tracking = { Identification: { ID: { Value: '2026-Jan' } } };
      const vulnerabilities = [{ CVE: 'CVE-2026-1' }];
      const productTree = { FullProductName: [] };
      const documents = {
        'product tree first': { ProductTree: productTree, Vulnerability: vulnerabilities },
        'vulnerabilities first': { Vulnerability: vulnerabilities, ProductTree: productTree },
      };
      const outcome = async (input: AsyncIterable<Uint8Array> | Uint8Array) =>
        parseMsrcCvrf(input).then(
          (result) => `ok ${result.documentId}`,
          (error: Error) => error.message
        );
      for (const [name, parts] of Object.entries(documents)) {
        const body = Buffer.from(JSON.stringify({ ...parts, DocumentTracking: tracking }));
        const whole = await outcome(new Uint8Array(body));
        for (const size of [1, 5, 50, body.length]) {
          expect([name, size, await outcome(sliced(body, size))]).toEqual([name, size, whole]);
        }
      }
      expect(
        await outcome(
          Buffer.from(
            JSON.stringify({ ...documents['product tree first'], DocumentTracking: tracking })
          )
        )
      ).toBe('ok 2026-Jan');
      expect(
        await outcome(
          Buffer.from(
            JSON.stringify({ ...documents['vulnerabilities first'], DocumentTracking: tracking })
          )
        )
      ).toMatch(/before its product tree/);
    });
  });
});

describe('parseMsrcUpdatesIndex', () => {
  const result = parseMsrcUpdatesIndex(fixture('updates_trimmed.json'));

  it('lists the validated months of security updates, newest data included', () => {
    expect(result.months.map((month) => month.id)).toEqual([
      '2026-Jul',
      '2026-Aug',
      '2026-Sep',
      '2026-Oct',
      '2026-Nov',
    ]);
    expect(result.months[0].currentReleaseDate).toEqual(expect.any(String));
  });

  it('skips IDs that are not a plain month token and Mariner release notes', () => {
    // 2017-May-B and 2018-FEB fail the month regex; 1999-Sep is a Mariner entry.
    expect(result.skipped).toEqual({
      updates_invalid_month_id: 2,
      updates_not_security_updates: 1,
    });
  });

  it('rejects a body that is not an index', () => {
    expect(() => parseMsrcUpdatesIndex(Buffer.from('nope'))).toThrow('not valid JSON');
    expect(() => parseMsrcUpdatesIndex(Buffer.from('{"value":3}'))).toThrow('no value array');
  });
});

describe('MSRC month tokens and URLs', () => {
  it.each(['2026-Nov', '1999-Sep'])('accepts %s', (month) => {
    expect(isMsrcMonth(month)).toBe(true);
    expect(msrcCvrfUrl(month)).toBe(`https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/${month}`);
  });

  it.each(['2017-May-B', '2018-FEB', '2026-nov', '2026-Nov/../x', '', '2026-Nov?x=1'])(
    'refuses %j before it can become a URL',
    (month) => {
      expect(isMsrcMonth(month)).toBe(false);
      expect(() => msrcCvrfUrl(month)).toThrow('Not an MSRC CVRF month');
    }
  );
});

describe('MSRC downloads', () => {
  const response = (
    status: number,
    chunks: Uint8Array[],
    headers: Record<string, string> = {}
  ): Response =>
    ({
      status,
      ok: status >= 200 && status < 300,
      statusText: String(status),
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(chunk));
          controller.close();
        },
      }),
    } as unknown as Response);

  it('reports a missing month (404) as unavailable', async () => {
    const fetchImpl = jest.fn(async () => response(404, []));
    await expect(
      downloadMsrcCvrf('2026-Nov', { feedMirrorUrl: undefined, fetchImpl })
    ).resolves.toEqual({
      status: 'unavailable',
      url: 'https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/2026-Nov',
    });
    await expect(
      downloadMsrcUpdatesIndex({ feedMirrorUrl: undefined, fetchImpl })
    ).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('streams a month into the parser without buffering it', async () => {
    const bytes = fixture('cvrf_2026-Oct_trimmed.json');
    const parts = [bytes.subarray(0, 30_000), bytes.subarray(30_000)];
    const fetchImpl = jest.fn(async () => response(200, parts));
    const result = await downloadMsrcCvrf('2026-Oct', { feedMirrorUrl: undefined, fetchImpl });
    if (result.status !== 'ok') throw new Error('expected ok');
    await expect(parseMsrcCvrf(result.chunks)).resolves.toMatchObject({ documentId: '2026-Oct' });
  });

  it('refuses a declared size over the feed cap and an HTTP error', async () => {
    const huge = jest.fn(async () =>
      response(200, [], { 'content-length': String(65 * 1024 * 1024) })
    );
    await expect(
      downloadMsrcCvrf('2026-Nov', { feedMirrorUrl: undefined, fetchImpl: huge })
    ).rejects.toThrow(/bytes/);
    const broken = jest.fn(async () => response(503, []));
    await expect(
      downloadMsrcCvrf('2026-Nov', { feedMirrorUrl: undefined, fetchImpl: broken })
    ).rejects.toThrow(/503/);
  });

  it('reads the update index', async () => {
    const body = fixture('updates_trimmed.json');
    const fetchImpl = jest.fn(async () => response(200, [body]));
    const result = await downloadMsrcUpdatesIndex({ feedMirrorUrl: undefined, fetchImpl });
    expect(result).toMatchObject({ status: 'ok', downloadedBytes: body.length });
  });

  it('releases the body of a download that is never iterated, on cancel() and on the deadline', async () => {
    const cancelled = jest.fn();
    const stalled = (): Response =>
      ({
        status: 200,
        ok: true,
        statusText: '200',
        headers: { get: () => null },
        body: new ReadableStream<Uint8Array>({ cancel: cancelled }),
      } as unknown as Response);
    const result = await downloadMsrcCvrf('2026-Nov', {
      feedMirrorUrl: undefined,
      fetchImpl: jest.fn(async () => stalled()),
    });
    if (result.status !== 'ok') throw new Error('expected ok');
    await result.cancel();
    expect(cancelled).toHaveBeenCalledTimes(1);

    cancelled.mockClear();
    const controller = new AbortController();
    const second = await downloadMsrcCvrf('2026-Nov', {
      feedMirrorUrl: undefined,
      fetchImpl: jest.fn(async () => stalled()),
      signal: controller.signal,
    });
    if (second.status !== 'ok') throw new Error('expected ok');
    controller.abort(new Error('scan cancelled'));
    await new Promise((resolve) => setImmediate(resolve));
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('never builds a request for an invalid month', async () => {
    const fetchImpl = jest.fn();
    await expect(
      downloadMsrcCvrf('2018-FEB', { feedMirrorUrl: undefined, fetchImpl })
    ).rejects.toThrow('Not an MSRC CVRF month');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
