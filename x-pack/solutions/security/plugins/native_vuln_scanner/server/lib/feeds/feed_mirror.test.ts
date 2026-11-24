/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { zstdCompressSync } from 'zlib';
import { clearKevCache, downloadKevCatalog } from '../enrichment/kev';
import { FEED_SOURCES } from './feed_sources';
import { downloadFeed, downloadMsrcCvrf, downloadMsrcUpdatesIndex, type FeedOs } from './fetch';
import { resolveFeedUrl } from './mirror';

const MIRROR = 'https://mirror.corp.example/feeds/';
const kevFixture = readFileSync(
  join(__dirname, '..', 'enrichment', '__fixtures__', 'kev_catalog_trimmed.json')
);
const msrcUpdates = readFileSync(join(__dirname, '__fixtures__', 'msrc', 'updates_trimmed.json'));
const rhelBz2 = readFileSync(join(__dirname, '__fixtures__', 'rhel_9_trimmed.oval.xml.bz2'));

const AbortSignalStatic = AbortSignal as unknown as {
  timeout?: (ms: number) => AbortSignal;
  any?: (signals: AbortSignal[]) => AbortSignal;
};
if (!AbortSignalStatic.timeout) {
  AbortSignalStatic.timeout = () => new AbortController().signal;
}
if (!AbortSignalStatic.any) {
  AbortSignalStatic.any = (signals) => signals[0] ?? new AbortController().signal;
}

const fakeResponse = (
  body: Uint8Array | string,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}
) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(typeof body === 'string' ? Buffer.from(body) : body);
        controller.close();
      },
    }),
  } as unknown as Response);

const ARCHIVE_NAME = 'csaf_advisories_2026-11-08.tar.zst';
const ARCHIVE_BUILT = 'Sun, 08 Nov 2026 11:22:30 GMT';
const EL10_DELTA_DOC = '{"cpe":"cpe:/o:redhat:enterprise_linux:10","id":"newer"}';
// Two zero blocks: a valid, empty tar.
const EMPTY_ARCHIVE = zstdCompressSync(Buffer.alloc(1024));

/** One fake vendor site: strips the mirror prefix so both layouts get the same answers. */
const vendorSite = (
  mirror?: string,
  { archiveLastModified = ARCHIVE_BUILT, changedAt = '2026-11-18T10:00:00Z' } = {}
) => {
  const requested: string[] = [];
  const prefix = mirror ? `${mirror.replace(/\/+$/, '')}/` : '';
  const fetchImpl = jest.fn(async (url: string, init?: { method?: string }) => {
    requested.push(url);
    const vendorUrl = prefix ? `https://${url.slice(prefix.length)}` : url;
    if (vendorUrl.endsWith('/archive_latest.txt')) return fakeResponse(`${ARCHIVE_NAME}\n`);
    if (vendorUrl.endsWith(ARCHIVE_NAME)) {
      return init?.method === 'HEAD'
        ? fakeResponse('', { headers: { 'last-modified': archiveLastModified } })
        : fakeResponse(EMPTY_ARCHIVE);
    }
    if (vendorUrl.endsWith('/changes.csv')) {
      return fakeResponse(`"2026/rhsa-2026_9999.json","${changedAt}"\n`);
    }
    if (vendorUrl.endsWith('/2026/rhsa-2026_9999.json')) return fakeResponse(EL10_DELTA_DOC);
    if (vendorUrl.includes('known_exploited_vulnerabilities')) return fakeResponse(kevFixture);
    if (vendorUrl.includes('api.msrc.microsoft.com/cvrf/v3.0/updates')) {
      return fakeResponse(msrcUpdates);
    }
    if (vendorUrl.includes('api.msrc.microsoft.com/cvrf/v3.0/cvrf/')) return fakeResponse('{}');
    return fakeResponse(rhelBz2);
  }) as unknown as jest.MockedFunction<typeof fetch>;
  return { fetchImpl, requested };
};

const UBUNTU: FeedOs = { family: 'ubuntu', version: 'noble' };
const RHEL9: FeedOs = { family: 'rhel', version: '9' };
const RHEL10: FeedOs = { family: 'rhel', version: '10' };

/** Every download the scanner makes, in one place: each case lists the vendor URLs it must hit. */
const scenarios: Array<{
  name: string;
  run: (feedMirrorUrl: string | undefined, fetchImpl: typeof fetch) => Promise<unknown>;
  vendorUrls: string[];
}> = [
  {
    name: 'Ubuntu OVAL',
    run: (feedMirrorUrl, fetchImpl) => downloadFeed(UBUNTU, { feedMirrorUrl, fetchImpl }),
    vendorUrls: ['https://security-metadata.canonical.com/oval/com.ubuntu.noble.cve.oval.xml.bz2'],
  },
  {
    name: 'RHEL OVAL',
    run: (feedMirrorUrl, fetchImpl) => downloadFeed(RHEL9, { feedMirrorUrl, fetchImpl }),
    vendorUrls: ['https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2'],
  },
  {
    name: 'RHEL OVAL including unpatched',
    run: (feedMirrorUrl, fetchImpl) =>
      downloadFeed(RHEL9, { feedMirrorUrl, fetchImpl, includeUnfixed: true }),
    vendorUrls: [
      'https://security.access.redhat.com/data/oval/v2/RHEL9/rhel-9-including-unpatched.oval.xml.bz2',
    ],
  },
  {
    name: 'RHEL 10 CSAF (archive_latest, archive HEAD+GET, changes.csv, one delta)',
    run: (feedMirrorUrl, fetchImpl) => downloadFeed(RHEL10, { feedMirrorUrl, fetchImpl }),
    vendorUrls: [
      'https://security.access.redhat.com/data/csaf/v2/advisories/archive_latest.txt',
      `https://security.access.redhat.com/data/csaf/v2/advisories/${ARCHIVE_NAME}`,
      'https://security.access.redhat.com/data/csaf/v2/advisories/changes.csv',
      'https://security.access.redhat.com/data/csaf/v2/advisories/2026/rhsa-2026_9999.json',
    ],
  },
  {
    name: 'MSRC updates index',
    run: (feedMirrorUrl, fetchImpl) => downloadMsrcUpdatesIndex({ feedMirrorUrl, fetchImpl }),
    vendorUrls: ['https://api.msrc.microsoft.com/cvrf/v3.0/updates'],
  },
  {
    name: 'MSRC monthly CVRF document',
    run: async (feedMirrorUrl, fetchImpl) => {
      const result = await downloadMsrcCvrf('2026-Nov', { feedMirrorUrl, fetchImpl });
      if (result.status === 'ok') {
        for await (const chunk of result.chunks) expect(chunk.byteLength).toBeGreaterThan(0);
      }
      return result;
    },
    vendorUrls: ['https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/2026-Nov'],
  },
  {
    name: 'CISA KEV',
    run: async (feedMirrorUrl, fetchImpl) => {
      clearKevCache();
      return downloadKevCatalog(undefined, undefined, { feedMirrorUrl, fetchImpl });
    },
    vendorUrls: [
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    ],
  },
];

describe('feed mirror: every download goes through resolveFeedUrl', () => {
  it.each(scenarios)('$name: unset mirror requests the vendor URLs unchanged', async (s) => {
    const { fetchImpl, requested } = vendorSite();
    await s.run(undefined, fetchImpl);
    expect([...new Set(requested)].sort()).toEqual([...s.vendorUrls].sort());
  });

  it.each(scenarios)('$name: a mirror requests <mirror>/<host>/<path> only', async (s) => {
    const { fetchImpl, requested } = vendorSite(MIRROR);
    await s.run(MIRROR, fetchImpl);
    const expected = s.vendorUrls.map((u) => resolveFeedUrl(u, MIRROR));
    expect([...new Set(requested)].sort()).toEqual([...expected].sort());
    expect(expected[0]).toMatch(/^https:\/\/mirror\.corp\.example\/feeds\/[^/]+\//);
    expect(requested.filter((u) => !u.startsWith('https://mirror.corp.example/feeds/'))).toEqual(
      []
    );
  });

  describe('CSAF archive build time', () => {
    const DELTA_URL =
      'https://security.access.redhat.com/data/csaf/v2/advisories/2026/rhsa-2026_9999.json';
    const MIRRORED_DELTA_URL = resolveFeedUrl(DELTA_URL, MIRROR);
    // The archive is named for 2026-11-08, so its content was built that day.
    const SAME_DAY_COPY = 'Sun, 08 Nov 2026 23:00:00 GMT';
    const CHANGED_BEFORE_COPY = '2026-11-08T15:00:00Z';

    it('uses the date in the archive name when a mirror copy was stamped later the same day', async () => {
      const { fetchImpl, requested } = vendorSite(MIRROR, {
        archiveLastModified: SAME_DAY_COPY,
        changedAt: CHANGED_BEFORE_COPY,
      });
      await downloadFeed(RHEL10, { feedMirrorUrl: MIRROR, fetchImpl });
      expect(requested).toContain(MIRRORED_DELTA_URL);
    });

    it('uses the date in the archive name when a mirror copy was stamped days later', async () => {
      const { fetchImpl, requested } = vendorSite(MIRROR, {
        archiveLastModified: 'Fri, 20 Nov 2026 09:00:00 GMT',
        changedAt: '2026-11-10T10:00:00Z',
      });
      await downloadFeed(RHEL10, { feedMirrorUrl: MIRROR, fetchImpl });
      expect(requested).toContain(MIRRORED_DELTA_URL);
    });

    it('keeps an earlier mirror header over the name date', async () => {
      const { fetchImpl, requested } = vendorSite(MIRROR, {
        archiveLastModified: 'Sat, 07 Nov 2026 20:00:00 GMT',
        changedAt: '2026-11-07T22:00:00Z',
      });
      await downloadFeed(RHEL10, { feedMirrorUrl: MIRROR, fetchImpl });
      expect(requested).toContain(MIRRORED_DELTA_URL);
    });

    it('trusts the vendor header without a mirror', async () => {
      const { fetchImpl, requested } = vendorSite(undefined, {
        archiveLastModified: SAME_DAY_COPY,
        changedAt: CHANGED_BEFORE_COPY,
      });
      await downloadFeed(RHEL10, { feedMirrorUrl: undefined, fetchImpl });
      expect(requested).not.toContain(DELTA_URL);
    });
  });

  it('records the mirrored URL in the unavailable result a caller reports', async () => {
    const fetchImpl = jest.fn(async () =>
      fakeResponse('Not Found', { status: 404 })
    ) as unknown as typeof fetch;
    const result = await downloadFeed(RHEL9, { feedMirrorUrl: MIRROR, fetchImpl });
    expect(result).toEqual(
      expect.objectContaining({
        status: 'unavailable',
        url: 'https://mirror.corp.example/feeds/security.access.redhat.com/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2',
      })
    );
  });
});

describe('FEED_SOURCES drift', () => {
  const patternToRegex = (pattern: string): RegExp =>
    new RegExp(
      `^${pattern
        .split(/<[^>]+>/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]+')}$`
    );

  it('lists every vendor URL the scenarios download, and nothing they never use', () => {
    const downloaded = scenarios.flatMap((s) => s.vendorUrls);
    for (const url of downloaded) {
      expect(FEED_SOURCES.some(({ urlPattern }) => patternToRegex(urlPattern).test(url))).toBe(
        true
      );
    }
    for (const { name, urlPattern } of FEED_SOURCES) {
      const regex = patternToRegex(urlPattern);
      expect({ name, covered: downloaded.some((url) => regex.test(url)) }).toEqual({
        name,
        covered: true,
      });
    }
  });

  const SERVER_DIR = join(__dirname, '..', '..');
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return entry === '__fixtures__' ? [] : sourceFiles(path);
      return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
    });
  const files = sourceFiles(SERVER_DIR).map((path) => ({
    name: relative(SERVER_DIR, path),
    text: readFileSync(path, 'utf8'),
  }));

  it('only the feed downloaders call fetch, and each imports resolveFeedUrl', () => {
    const networkCall =
      /\bfetchImpl\s*\(|(?<![.\w])fetch\s*\(|globalThis\.fetch\s*\(|\bhttps?\.(get|request)\b|undici/;
    const callers = files.filter(({ text }) => networkCall.test(text));
    expect(callers.map(({ name }) => name).sort()).toEqual([
      'lib/enrichment/kev.ts',
      'lib/feeds/fetch.ts',
    ]);
    for (const { name, text } of callers) {
      expect({ name, usesHelper: /\bresolveFeedUrl\(/.test(text) }).toEqual({
        name,
        usesHelper: true,
      });
    }
  });

  it('the README mirror table lists every FEED_SOURCES row', () => {
    const readme = readFileSync(join(SERVER_DIR, '..', 'README.md'), 'utf8');
    const section = readme.slice(readme.indexOf('## Air-gapped deployments'));
    for (const { urlPattern } of FEED_SOURCES) {
      // The README groups the CSAF rows into one cell and names `changes.csv` bare, so a row is
      // listed when its whole stem appears, or its directory and file name each appear.
      const stem = urlPattern.replace(/<.*$/, '');
      const directory = stem.slice(0, stem.lastIndexOf('/') + 1);
      const file = stem.slice(directory.length);
      const listed =
        section.includes(stem) || (section.includes(directory) && section.includes(file));
      expect({ urlPattern, listed }).toEqual({ urlPattern, listed: true });
    }
  });

  it('vendor feed hosts are written only in feed_sources.ts', () => {
    const hosts =
      /security-metadata\.canonical\.com|security\.access\.redhat\.com\/data|www\.cisa\.gov\/sites|api\.msrc\.microsoft\.com/;
    expect(files.filter(({ text }) => hosts.test(text)).map(({ name }) => name)).toEqual([
      'lib/feeds/feed_sources.ts',
    ]);
  });
});
