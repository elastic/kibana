/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { MsrcAdvisoryRow } from '../feeds/msrc_cvrf';
import { parseMsrcCvrf } from '../feeds/msrc_cvrf';
import type { WindowsOsProduct } from '../inventory/windows_os_product';
import type { MatchStats } from './types';
import { buildWindowsAdvisoryIndex, matchWindowsHost } from './windows_match';

type Slice = Parameters<typeof buildWindowsAdvisoryIndex>[0][number];

const WIN10: Omit<WindowsOsProduct, 'ubr' | 'installedBuild'> = {
  productId: '12097',
  arch: 'x64',
  build: 19045,
  label: 'Windows 10 22H2',
};
const WIN11_24H2: Omit<WindowsOsProduct, 'ubr' | 'installedBuild'> = {
  productId: '12390',
  arch: 'x64',
  build: 26100,
  label: 'Windows 11 24H2',
};

const productAt = (
  base: Omit<WindowsOsProduct, 'ubr' | 'installedBuild'>,
  ubr: number
): WindowsOsProduct => ({ ...base, ubr, installedBuild: `10.0.${base.build}.${ubr}` });

const loadMonth = async (month: string): Promise<Slice> => {
  const { rows, cves } = await parseMsrcCvrf(
    readFileSync(
      join(__dirname, '..', 'feeds', '__fixtures__', 'msrc', `cvrf_${month}_trimmed.json`)
    )
  );
  return { rows, cves };
};

/** One synthetic row; the fixture months cannot express an SSU or a CVE fixed twice. */
const row = (over: Partial<MsrcAdvisoryRow> & Pick<MsrcAdvisoryRow, 'cve' | 'kb' | 'ubr'>) => {
  const build = over.build ?? 19045;
  return {
    productId: '12097',
    build,
    hotpatch: false,
    subType: 'Security Update',
    supersedes: [],
    fixedBuild: `10.0.${build}.${over.ubr}`,
    ...over,
  } as MsrcAdvisoryRow;
};

describe('matchWindowsHost', () => {
  let months: Slice[];
  let index: ReturnType<typeof buildWindowsAdvisoryIndex>;

  beforeAll(async () => {
    // Newest first, as the refresh returns them.
    months = await Promise.all(['2026-Nov', '2026-Oct', '2026-Sep', '2026-Jul'].map(loadMonth));
    index = buildWindowsAdvisoryIndex(months);
  });

  const distinctCves = (productId: string, build: number): string[] => [
    ...new Set(
      months.flatMap(({ rows }) =>
        rows.filter((r) => r.productId === productId && r.build === build).map((r) => r.cve)
      )
    ),
  ];

  describe('a regular host', () => {
    it('gets one finding per CVE, naming the latest fixing update and what it replaces', () => {
      const findings = matchWindowsHost({ id: 'h1', product: productAt(WIN10, 7500) }, index);

      const cves = distinctCves('12097', 19045);
      expect(findings.map((f) => f.cve.id).sort()).toEqual([...cves].sort());
      expect(new Set(findings.map((f) => f.cve.id)).size).toBe(findings.length);
      const [first] = findings;
      expect(first.scheme).toBe('windows_build');
      expect(first.package).toEqual({ name: '12097', version: '10.0.19045.7500' });
      expect(first.advisories[0]).toMatchObject({ source: 'msrc' });
      expect(first.windows?.enrolmentKb).toBeUndefined();
    });

    it('names the latest cumulative update for every CVE, whichever month fixed it', () => {
      const findings = matchWindowsHost({ id: 'h1', product: productAt(WIN10, 7500) }, index);
      const ceilingRow = months
        .flatMap(({ rows }) => rows)
        .find((r) => r.productId === '12097' && r.build === 19045 && r.kb === '5131096');

      // CVE-2026-33842 is fixed by the July update (5099539, build 7548), which the November
      // update replaces; the finding still exists because of 7548 but names the update to install.
      const july = findings.find((f) => f.cve.id === 'CVE-2026-33842');
      expect(july?.fixedVersion).toBe('10.0.19045.7548');
      expect(july?.windows).toMatchObject({
        kb: '5131096',
        fixedBuild: '10.0.19045.7548',
        kind: 'security_update',
        productId: '12097',
      });
      expect(july?.advisories[0].id).toBe('KB5131096');
      expect(new Set(findings.map((f) => f.windows?.kb))).toEqual(new Set(['5131096']));
      expect(ceilingRow?.supersedes.length).toBeGreaterThan(0);
      for (const finding of findings) {
        expect(finding.windows?.supersededKbs).toEqual(ceilingRow?.supersedes);
      }
    });

    it('keeps each finding’s own fixed build, which decides whether it exists', () => {
      const fixedBy = (ubr: number) =>
        new Set(
          matchWindowsHost({ id: 'h', product: productAt(WIN10, ubr) }, index).map((f) => f.cve.id)
        );

      expect(fixedBy(7500).has('CVE-2026-33842')).toBe(true);
      expect(fixedBy(7548).has('CVE-2026-33842')).toBe(false);
      expect(fixedBy(7548).has('CVE-2026-100223')).toBe(true);
    });

    it('stops at the fixed build: below it is a finding, at it and above it is not', () => {
      const fixed = '10.0.19045.7846';
      const at = (ubr: number) =>
        matchWindowsHost({ id: 'h', product: productAt(WIN10, ubr) }, index).filter(
          (f) => f.cve.id === 'CVE-2026-100223'
        );

      expect(at(7845)).toHaveLength(1);
      expect(at(7845)[0].fixedVersion).toBe(fixed);
      expect(at(7846)).toEqual([]);
      expect(at(7847)).toEqual([]);
      expect(matchWindowsHost({ id: 'h', product: productAt(WIN10, 7846) }, index)).toEqual([]);
    });

    it('compares the revision as a number', () => {
      const small = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-1', kb: '1', ubr: 10000 })], cves: [] },
      ]);

      expect(matchWindowsHost({ id: 'h', product: productAt(WIN10, 9999) }, small)).toHaveLength(1);
      expect(matchWindowsHost({ id: 'h', product: productAt(WIN10, 10000) }, small)).toEqual([]);
    });

    it('names the update with the highest build when a CVE is listed in several months', () => {
      const slices = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-1', kb: '300', ubr: 300, supersedes: ['200'] })], cves: [] },
        { rows: [row({ cve: 'CVE-2026-1', kb: '200', ubr: 200, supersedes: ['100'] })], cves: [] },
        { rows: [row({ cve: 'CVE-2026-1', kb: '100', ubr: 100 })], cves: [] },
      ]);

      const findings = matchWindowsHost({ id: 'h', product: productAt(WIN10, 50) }, slices);

      expect(findings).toHaveLength(1);
      expect(findings[0].windows?.kb).toBe('300');
      expect(findings[0].fixedVersion).toBe('10.0.19045.300');
    });

    it('names the update to install even when it does not list the CVE', () => {
      const slices = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-2', kb: '400', ubr: 400, supersedes: ['300'] })], cves: [] },
        { rows: [row({ cve: 'CVE-2026-1', kb: '300', ubr: 300, supersedes: ['200'] })], cves: [] },
      ]);

      const findings = matchWindowsHost({ id: 'h', product: productAt(WIN10, 350) }, slices);

      expect(findings.map((f) => [f.cve.id, f.windows?.kb])).toEqual([['CVE-2026-2', '400']]);
      const behind = matchWindowsHost({ id: 'h', product: productAt(WIN10, 100) }, slices);
      expect(behind.map((f) => [f.cve.id, f.fixedVersion, f.windows?.kb]).sort()).toEqual([
        ['CVE-2026-1', '10.0.19045.300', '400'],
        ['CVE-2026-2', '10.0.19045.400', '400'],
      ]);
    });

    it('caps the replaced KBs at 32', () => {
      const supersedes = Array.from({ length: 40 }, (_, i) => String(1000 + i));
      const slices = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-1', kb: '9', ubr: 300, supersedes })], cves: [] },
      ]);

      const [finding] = matchWindowsHost({ id: 'h', product: productAt(WIN10, 1) }, slices);

      expect(finding.windows?.supersededKbs).toHaveLength(32);
    });

    it('unions what the ceiling update replaces across all of its rows', () => {
      const slices = buildWindowsAdvisoryIndex([
        {
          rows: [
            row({ cve: 'CVE-2026-1', kb: '900', ubr: 900, supersedes: ['800', '700'] }),
            row({ cve: 'CVE-2026-2', kb: '900', ubr: 900, supersedes: ['700', '600'] }),
            row({ cve: 'CVE-2026-3', kb: '900', ubr: 900 }),
          ],
          cves: [],
        },
      ]);

      const findings = matchWindowsHost({ id: 'h', product: productAt(WIN10, 1) }, slices);

      expect(findings).toHaveLength(3);
      for (const finding of findings) {
        expect(finding.windows?.supersededKbs).toEqual(['800', '700', '600']);
      }
    });

    it('records the installed KBs as bare digits, deduplicated and capped at 32', () => {
      const slices = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-1', kb: '9', ubr: 300 })], cves: [] },
      ]);
      const many = Array.from({ length: 40 }, (_, i) => `KB${2000 + i}`);

      const [finding] = matchWindowsHost(
        {
          id: 'h',
          product: productAt(WIN10, 1),
          hotfixIds: ['KB5131096', 'kb5131096', '5131097', 'not a kb', '', ...many],
        },
        slices
      );

      expect(finding.windows?.installedKbs).toHaveLength(32);
      expect(finding.windows?.installedKbs.slice(0, 3)).toEqual(['5131096', '5131097', '2000']);
      expect(new Set(finding.windows?.installedKbs).size).toBe(32);
    });

    it('records an empty list when the host reported no patches', () => {
      const slices = buildWindowsAdvisoryIndex([
        { rows: [row({ cve: 'CVE-2026-1', kb: '9', ubr: 300 })], cves: [] },
      ]);

      const [finding] = matchWindowsHost({ id: 'h', product: productAt(WIN10, 1) }, slices);

      expect(finding.windows?.installedKbs).toEqual([]);
    });

    it('finds nothing for a product the feed lists only as known affected, with no fix', async () => {
      // A status-only entry (affected, no Vendor Fix row) is not a finding: with no fixed build
      // there is nothing to compare the host against and nothing to tell the user to install.
      const document = {
        DocumentTracking: { Identification: { ID: { Value: '2026-Oct' } } },
        ProductTree: {
          FullProductName: [
            { ProductID: '12097', Value: 'Windows 10 Version 22H2 for x64-based Systems' },
          ],
        },
        Vulnerability: [
          {
            CVE: 'CVE-2026-0003',
            Title: { Value: 'Status-only' },
            ProductStatuses: [{ Type: 3, ProductID: ['12097'] }],
            Remediations: [
              { Type: 3, ProductID: ['12097'], Description: { Value: 'Release Notes' } },
            ],
          },
        ],
      };
      const parsed = await parseMsrcCvrf(Buffer.from(JSON.stringify(document)));
      const slices = buildWindowsAdvisoryIndex([parsed]);

      expect(parsed.rows).toEqual([]);
      expect(matchWindowsHost({ id: 'h', product: productAt(WIN10, 1) }, slices)).toEqual([]);
    });

    it('picks the cumulative update by sub-type, not a servicing stack update with a higher build', () => {
      const slices = buildWindowsAdvisoryIndex([
        {
          rows: [
            row({ cve: 'CVE-2026-1', kb: '100', ubr: 100 }),
            row({ cve: 'CVE-2026-1', kb: '900', ubr: 900, subType: 'Servicing Stack Update' }),
          ],
          cves: [],
        },
      ]);

      const [finding] = matchWindowsHost({ id: 'h', product: productAt(WIN10, 50) }, slices);

      expect(finding.windows?.kb).toBe('100');
      expect(finding.fixedVersion).toBe('10.0.19045.100');
      // A host between the two is clear: the servicing stack update is never a target.
      expect(matchWindowsHost({ id: 'h', product: productAt(WIN10, 100) }, slices)).toEqual([]);
    });

    it('carries the CVE title and score from the feed', () => {
      const [finding] = matchWindowsHost({ id: 'h', product: productAt(WIN10, 7500) }, index);

      expect(finding.cve.cvss).toBeDefined();
      expect(finding.advisories[0].title.length).toBeGreaterThan(0);
      expect(finding.advisories[0].url).toBe(
        `https://support.microsoft.com/help/${finding.windows?.kb}`
      );
    });
  });

  describe('a hotpatch-enrolled host', () => {
    const LCU_FINDINGS = ['CVE-2026-111497', 'CVE-2026-100223', 'CVE-2026-102200'];

    it('is fixed at the hotpatch build when it is lower than the cumulative update', () => {
      const host = {
        id: 'h',
        product: productAt(WIN11_24H2, 9911),
        hotfixIds: ['KB5132043'],
      };

      const findings = matchWindowsHost(host, index);

      expect(findings.filter((f) => LCU_FINDINGS.includes(f.cve.id))).toEqual([]);
    });

    it('is told to install the hotpatch below its build, with the enrolling KB as evidence', () => {
      const findings = matchWindowsHost(
        { id: 'h', product: productAt(WIN11_24H2, 9800), hotfixIds: ['5132043'] },
        index
      );

      const hit = findings.find((f) => f.cve.id === 'CVE-2026-100223');
      expect(hit?.windows).toMatchObject({
        kind: 'hotpatch',
        kb: '5132043',
        fixedBuild: '10.0.26100.9911',
        enrolmentKb: '5132043',
      });
      expect(new Set(findings.map((f) => f.cve.id)).size).toBe(findings.length);
    });

    it('names the latest hotpatch at or above the CVE’s own hotpatch build', () => {
      const hotpatch = (
        over: Partial<MsrcAdvisoryRow> & Pick<MsrcAdvisoryRow, 'cve' | 'kb' | 'ubr'>
      ) => row({ hotpatch: true, subType: 'Security Hotpatch Update', ...over });
      const slices = buildWindowsAdvisoryIndex([
        {
          rows: [
            hotpatch({ cve: 'CVE-2026-2', kb: '700', ubr: 700, supersedes: ['600'] }),
            row({ cve: 'CVE-2026-2', kb: '900', ubr: 900 }),
          ],
          cves: [],
        },
        {
          rows: [
            hotpatch({ cve: 'CVE-2026-1', kb: '600', ubr: 600 }),
            row({ cve: 'CVE-2026-1', kb: '800', ubr: 800 }),
          ],
          cves: [],
        },
      ]);

      const enrolled = matchWindowsHost(
        { id: 'h', product: productAt(WIN10, 100), hotfixIds: ['KB600'] },
        slices
      );

      expect(enrolled.map((f) => [f.cve.id, f.windows?.kind, f.windows?.kb]).sort()).toEqual([
        ['CVE-2026-1', 'hotpatch', '700'],
        ['CVE-2026-2', 'hotpatch', '700'],
      ]);
      const first = enrolled.find((f) => f.cve.id === 'CVE-2026-1');
      expect(first?.fixedVersion).toBe('10.0.19045.600');
      expect(first?.windows?.supersededKbs).toEqual(['600']);
    });

    it('uses the cumulative update for the same host when it is not enrolled', () => {
      const findings = matchWindowsHost({ id: 'h', product: productAt(WIN11_24H2, 9911) }, index);

      const hit = findings.find((f) => f.cve.id === 'CVE-2026-100223');
      expect(hit?.windows).toMatchObject({
        kind: 'security_update',
        kb: '5132061',
        fixedBuild: '10.0.26100.9974',
      });
      expect(hit?.windows?.enrolmentKb).toBeUndefined();
    });

    it('does not count another product’s hotpatch KB as enrolment', () => {
      // 5131077 is the hotpatch of Windows Server 2025 in these documents, not of Windows 11 24H2.
      const findings = matchWindowsHost(
        { id: 'h', product: productAt(WIN11_24H2, 9911), hotfixIds: ['KB5131077'] },
        index
      );

      const hit = findings.find((f) => f.cve.id === 'CVE-2026-100223');
      expect(hit?.windows?.kind).toBe('security_update');
    });

    it('does not create a finding from patches alone', () => {
      const findings = matchWindowsHost(
        { id: 'h', product: productAt(WIN11_24H2, 9974), hotfixIds: ['KB5132043', 'KB1'] },
        index
      );

      expect(findings.filter((f) => LCU_FINDINGS.includes(f.cve.id))).toEqual([]);
    });
  });

  describe('hosts with nothing to match', () => {
    it('reports no findings and counts the host for an unknown product', () => {
      const stats: MatchStats = {};

      const findings = matchWindowsHost(
        { id: 'h', product: { ...productAt(WIN10, 1), productId: '99999' } },
        index,
        stats
      );

      expect(findings).toEqual([]);
      expect(stats.no_advisories_for_os).toBe(1);
    });

    it('does not match a different servicing line of the same product', () => {
      const other = { ...productAt(WIN10, 1), build: 19044, installedBuild: '10.0.19044.1' };

      expect(matchWindowsHost({ id: 'h', product: other }, index)).toEqual([]);
    });

    it('ignores a CVE that has no row for the host’s product', () => {
      // Server 2019 is in the fixtures, and a Windows 8.1-only CVE has no row for any id here.
      const findings = matchWindowsHost(
        { id: 'h', product: productAt(WIN10, 7500) },
        buildWindowsAdvisoryIndex([
          { rows: [row({ cve: 'CVE-2026-1', kb: '1', ubr: 9, productId: '11571' })], cves: [] },
        ])
      );

      expect(findings).toEqual([]);
    });
  });

  describe('windows_build_older_than_window', () => {
    it('counts a host below the oldest fix in the window', () => {
      const stats: MatchStats = {};

      matchWindowsHost({ id: 'h', product: productAt(WIN10, 7500) }, index, stats);
      matchWindowsHost({ id: 'h', product: productAt(WIN10, 7600) }, index, stats);

      expect(stats.windows_build_older_than_window).toBe(1);
    });

    it('does not count a host at or above it', () => {
      const stats: MatchStats = {};

      matchWindowsHost({ id: 'h', product: productAt(WIN10, 7548) }, index, stats);

      expect(stats.windows_build_older_than_window).toBeUndefined();
    });
  });
});
