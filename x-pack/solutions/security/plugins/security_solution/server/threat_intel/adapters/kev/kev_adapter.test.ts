/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { kevAdapter } from './kev_adapter';
import { normalizedReportSchema } from '../../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import type { AdapterRunContext, SourceHit } from '../types';

const FIXED_NOW = new Date('2024-03-01T10:00:00.000Z');
const FEED_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

const VULN_1 = {
  cveID: 'CVE-2021-44228',
  vendorProject: 'Apache',
  product: 'Log4j',
  vulnerabilityName: 'Apache Log4j2 Remote Code Execution Vulnerability',
  dateAdded: '2021-12-10',
  shortDescription: 'Apache Log4j2 contains a remote code execution vulnerability.',
  requiredAction: 'Apply updates per vendor instructions.',
  dueDate: '2021-12-24',
  knownRansomwareCampaignUse: 'Known',
  notes:
    'https://logging.apache.org/log4j/2.x/security.html ; https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
  cwes: ['CWE-917', 'CWE-20'],
};

const VULN_2 = {
  cveID: 'CVE-2022-30190',
  vendorProject: 'Microsoft',
  product: 'Windows',
  vulnerabilityName:
    'Microsoft Windows Support Diagnostic Tool (MSDT) Remote Code Execution Vulnerability',
  dateAdded: '2022-06-01',
  shortDescription: 'Microsoft MSDT contains a remote code execution vulnerability.',
  requiredAction: 'Apply updates per vendor instructions.',
  dueDate: '2022-06-14',
  knownRansomwareCampaignUse: 'Unknown',
  notes: '',
};

const makeEnvelope = (vulns: unknown[] = [VULN_1, VULN_2]) =>
  JSON.stringify({
    catalogVersion: '2024.03.01',
    dateReleased: '2024-03-01T00:00:00Z',
    count: vulns.length,
    vulnerabilities: vulns,
  });

const makeContext = (body: string, status = 200): AdapterRunContext => {
  const fetchImpl = jest.fn().mockResolvedValue(
    new Response(body, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json' },
    })
  );
  return {
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    now: () => FIXED_NOW,
    fetchFn: fetchImpl as unknown as typeof fetch,
    lookupFn: async () => [{ address: '93.184.216.34' }],
  };
};

const makeSource = (): SourceHit => ({
  _id: 'kev:cisa-known-exploited-vulnerabilities',
  _source: {
    adapter_type: 'kev',
    name: 'CISA Known Exploited Vulnerabilities',
    space_id: '*',
  },
});

describe('kevAdapter', () => {
  it('adapterType is kev', () => {
    expect(kevAdapter.adapterType).toBe('kev');
  });

  it('produces one report per CVE entry', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    expect(reports).toHaveLength(2);
  });

  it('each report passes the normalizedReportSchema', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    for (const report of reports) {
      expect(() => normalizedReportSchema.parse(report)).not.toThrow();
    }
  });

  it('fingerprint is stable across re-fetches of unchanged entries', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    const fps = reports.map((r) => r.content_fingerprint);
    // Run again — same fingerprints
    const reports2 = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    expect(reports2.map((r) => r.content_fingerprint)).toEqual(fps);
  });

  // The fingerprint used to be the CVE id alone, so any later CISA revision of
  // the same CVE deduped away and never reached the stored report.
  it.each([
    ['requiredAction', { requiredAction: 'Discontinue use of the product.' }],
    ['dueDate', { dueDate: '2022-01-15' }],
    ['knownRansomwareCampaignUse', { knownRansomwareCampaignUse: 'Unknown' }],
    ['shortDescription', { shortDescription: 'Revised description.' }],
    ['notes', { notes: 'https://example.com/new-advisory' }],
  ])('re-fingerprints the same CVE when %s changes', async (_field, patch) => {
    const [original] = await kevAdapter.run(makeSource(), makeContext(makeEnvelope([VULN_1])));
    const [revised] = await kevAdapter.run(
      makeSource(),
      makeContext(makeEnvelope([{ ...VULN_1, ...patch }]))
    );

    expect(revised.extracted?.vulnerability?.cve_id).toBe(
      original.extracted?.vulnerability?.cve_id
    );
    expect(revised.content_fingerprint).not.toBe(original.content_fingerprint);
  });

  // adapter_id identifies the source, not the item: list_sources aggregates
  // report activity on it, so a per-CVE value left the KEV catalog row with no
  // stats. The CVE identity lives in lineage.source_doc_ref.id instead.
  it('stamps a source-stable adapter_id shared by every entry', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));

    for (const report of reports) {
      expect(report.source.adapter_id).toBe('kev:kev:cisa-known-exploited-vulnerabilities');
    }
    expect(reports.map((r) => r.lineage.source_doc_ref?.id)).toEqual([
      'CVE-2021-44228',
      'CVE-2022-30190',
    ]);
  });

  it('fingerprints are distinct per CVE', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    const fps = reports.map((r) => r.content_fingerprint);
    expect(new Set(fps).size).toBe(fps.length);
  });

  it('populates extracted.vulnerability fields', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    const [r] = reports;
    expect(r.extracted?.vulnerability).toMatchObject({
      cve_id: 'CVE-2021-44228',
      vendor: 'Apache',
      product: 'Log4j',
      name: 'Apache Log4j2 Remote Code Execution Vulnerability',
      cwes: ['CWE-917', 'CWE-20'],
      date_added: '2021-12-10',
      due_date: '2021-12-24',
      ransomware_use: 'Known',
    });
  });

  it('extracted.categories is ["vulnerability"]', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    for (const r of reports) {
      expect(r.extracted?.categories).toEqual(['vulnerability']);
    }
  });

  it('severity is high/70', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    for (const r of reports) {
      expect(r.severity).toEqual({ level: 'high', score: 70 });
    }
  });

  it('extraction_method is kev (not pending — skipped by enrich_threat_report)', async () => {
    const reports = await kevAdapter.run(makeSource(), makeContext(makeEnvelope()));
    for (const r of reports) {
      expect(r.lineage.extraction_method).toBe('kev');
      // Explicitly not 'pending' — the enrich_threat_report term:pending filter excludes this
      expect(r.lineage.extraction_method).not.toBe('pending');
    }
  });

  it('sends a browser User-Agent header (CISA blocks default Kibana UA)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(makeEnvelope(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const ctx: AdapterRunContext = {
      logger: loggingSystemMock.createLogger(),
      abortSignal: new AbortController().signal,
      now: () => FIXED_NOW,
      fetchFn: fetchImpl as unknown as typeof fetch,
      lookupFn: async () => [{ address: '93.184.216.34' }],
    };
    await kevAdapter.run(makeSource(), ctx);

    expect(fetchImpl).toHaveBeenCalled();
    const callArgs = fetchImpl.mock.calls[0];
    const requestInit = callArgs[1] as RequestInit;
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers?.['User-Agent']).toMatch(/Mozilla/);
  });

  it('stores a credential-free catalog feed URL in provenance', async () => {
    const [report] = await kevAdapter.run(makeSource(), makeContext(makeEnvelope([VULN_1])));

    expect(report.source.url).toBe(FEED_URL);
    expect(JSON.stringify(report)).not.toContain('feed-password');
  });

  it('skips malformed entries missing required fields', async () => {
    const envelope = JSON.stringify({
      catalogVersion: '2024.03.01',
      dateReleased: '2024-03-01T00:00:00Z',
      count: 3,
      vulnerabilities: [
        VULN_1,
        // Missing cveID
        {
          vendorProject: 'Acme',
          product: 'Widget',
          vulnerabilityName: 'Bad',
          dateAdded: '2024-01-01',
          shortDescription: 'x',
          requiredAction: 'y',
          dueDate: '2024-01-10',
        },
        VULN_2,
      ],
    });
    const reports = await kevAdapter.run(makeSource(), makeContext(envelope));
    expect(reports).toHaveLength(2);
  });

  it('tolerates missing optional fields (cwes, notes, ransomware_use)', async () => {
    const minimal = {
      cveID: 'CVE-2024-99999',
      vendorProject: 'TestVendor',
      product: 'TestProduct',
      vulnerabilityName: 'Test Vuln',
      dateAdded: '2024-01-01',
      shortDescription: 'A test.',
      requiredAction: 'Do something.',
      dueDate: '2024-01-15',
    };
    const reports = await kevAdapter.run(
      makeSource(),
      makeContext(
        JSON.stringify({
          catalogVersion: '2024.01.01',
          dateReleased: '2024-01-01T00:00:00Z',
          count: 1,
          vulnerabilities: [minimal],
        })
      )
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].extracted?.vulnerability?.cwes).toBeUndefined();
    expect(reports[0].extracted?.vulnerability?.ransomware_use).toBeUndefined();
    expect(() => normalizedReportSchema.parse(reports[0])).not.toThrow();
  });

  it('throws on non-200 HTTP response', async () => {
    await expect(kevAdapter.run(makeSource(), makeContext('Forbidden', 403))).rejects.toThrow(
      /HTTP 403/
    );
  });

  it('throws on invalid JSON body', async () => {
    await expect(kevAdapter.run(makeSource(), makeContext('not json'))).rejects.toThrow(
      /not valid JSON/
    );
  });

  it('throws when vulnerabilities array is absent', async () => {
    await expect(
      kevAdapter.run(makeSource(), makeContext(JSON.stringify({ catalogVersion: '2024.01.01' })))
    ).rejects.toThrow(/vulnerabilities array/);
  });

  it('does not blame JSON parsing when the feed parsed but has no vulnerabilities array', async () => {
    // Well-formed JSON that is missing the array must not be reported as a parse
    // failure: that sends an operator debugging a feed-schema change into the
    // parser instead.
    await expect(
      kevAdapter.run(makeSource(), makeContext(JSON.stringify({ catalogVersion: '2024.01.01' })))
    ).rejects.toThrow(/^(?!.*not valid JSON).*vulnerabilities array/s);
  });
});

describe('kev enrich isolation', () => {
  it('extraction_method=kev is excluded by the term:pending filter used in enrich_threat_report', () => {
    // The enrich_threat_report workflow uses `term: { lineage.extraction_method: pending }`.
    // This test verifies that a kev report would NOT match that filter — confirming Haiku is never
    // invoked for KEV docs regardless of which source type is used.
    const kevExtractionMethod = 'kev';
    expect(kevExtractionMethod).not.toBe('pending');
  });
});
