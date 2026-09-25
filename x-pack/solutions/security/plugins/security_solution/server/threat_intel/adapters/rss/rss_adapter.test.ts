/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CATALOG_SOURCE_URLS } from '../../../../common/threat_intel';
import { extractIocs } from '../../services/extract_iocs';
import { rssAdapter } from './rss_adapter';
import type { AdapterRunContext, SourceHit } from '../types';

const SOURCE_ID = 'vendor_api:elastic-security-labs';
const FEED_URL = CATALOG_SOURCE_URLS[SOURCE_ID];
const FEED_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Acme</title>
  <item>
    <title>Item one</title>
    <guid>acme:1</guid>
    <link>https://acme.example/1</link>
    <pubDate>Mon, 12 May 2025 09:30:00 GMT</pubDate>
    <description><![CDATA[<p>Body one</p>]]></description>
  </item>
  <item>
    <title>Item two</title>
    <guid>acme:2</guid>
    <link>https://acme.example/2</link>
    <pubDate>Tue, 13 May 2025 09:30:00 GMT</pubDate>
    <description>Body two</description>
  </item>
</channel></rss>`;

const buildSource = (overrides: Partial<SourceHit['_source']> = {}): SourceHit => ({
  _id: SOURCE_ID,
  _source: {
    adapter_type: 'rss',
    name: 'Elastic Security Labs',
    ...overrides,
  },
});

const NOW = new Date('2026-05-16T12:00:00.000Z');

const buildContext = (fetchImpl: typeof fetch): AdapterRunContext => ({
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  now: () => NOW,
  fetchFn: fetchImpl,
  lookupFn: async () => [{ address: '93.184.216.34' }],
});

const okResponse = (body: string): Response =>
  new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/rss+xml' },
  });

describe('rssAdapter', () => {
  it('emits one normalized report per RSS item', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(FEED_BODY));
    const reports = await rssAdapter.run(buildSource(), buildContext(fetchMock));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(FEED_URL);

    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      '@timestamp': NOW.toISOString(),
      space_id: '*',
      source: {
        type: 'rss',
        name: 'Elastic Security Labs',
        url: 'https://acme.example/1',
        adapter_id: 'rss:vendor_api:elastic-security-labs',
      },
      content: {
        title: 'Item one',
        body_text: 'Body one',
        language: 'en',
      },
      severity: { level: 'medium', score: 40 },
      lineage: {
        ingested_at: NOW.toISOString(),
        extraction_method: 'pending',
        source_doc_ref: { index: 'rss:feed', id: 'acme:1' },
      },
    });
    // Fingerprint must be a stable 64-hex digest (matches buildFingerprint).
    expect(reports[0].content_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(reports[0].content_fingerprint).not.toBe(reports[1].content_fingerprint);
  });

  it('stores only plain text — never the raw markup fragment', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(FEED_BODY));
    const reports = await rssAdapter.run(buildSource(), buildContext(fetchMock));

    for (const report of reports) {
      expect(report.content).not.toHaveProperty('body_html');
      expect(report.content.body_text).not.toMatch(/<[a-z]/i);
    }
  });

  it('preserves RSS headings through IOC section tiering', async () => {
    const structuredFeed = FEED_BODY.replace(
      '<p>Body one</p>',
      [
        '<h2>Indicators of Compromise</h2><p>callnrwise.com</p>',
        '<h2>References</h2><p>https://citation.example.org/report</p>',
      ].join('')
    );
    const reports = await rssAdapter.run(
      buildSource(),
      buildContext(jest.fn().mockResolvedValue(okResponse(structuredFeed)))
    );

    const extracted = extractIocs({ text: reports[0].content.body_text });
    expect(extracted.iocs).toContainEqual(
      expect.objectContaining({
        type: 'domain',
        value: 'callnrwise.com',
        tier: 'discriminating',
        tier_basis: 'ioc_section',
      })
    );
    expect(extracted.iocs).toContainEqual(
      expect.objectContaining({
        type: 'url',
        value: 'https://citation.example.org/report',
        tier: 'reference',
        tier_basis: 'references_section',
      })
    );
  });

  // Load-bearing invariant: an entry link is provenance metadata only. The adapter fetches
  // the configured feed URL and nothing else — it must never fetch each item's link.
  it('never fetches an entry link, only the configured feed URL', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(FEED_BODY));
    await rssAdapter.run(buildSource(), buildContext(fetchMock));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested).toEqual([FEED_URL]);
    expect(requested).not.toContain('https://acme.example/1');
    expect(requested).not.toContain('https://acme.example/2');
  });

  it('removes credentials from entry provenance', async () => {
    const feed = FEED_BODY.replace(
      'https://acme.example/1',
      'https://feed-user:feed-secret@acme.example/1'
    );
    const reports = await rssAdapter.run(
      buildSource(),
      buildContext(jest.fn().mockResolvedValue(okResponse(feed)))
    );

    expect(reports[0].source.url).toBe('https://acme.example/1');
  });

  it.each(['file:///etc/passwd', 'data:text/plain,secret', 'not a url'])(
    'falls back to the normalized feed URL for invalid entry link %s',
    async (entryLink) => {
      const feed = FEED_BODY.replace('https://acme.example/1', entryLink);
      const reports = await rssAdapter.run(
        buildSource(),
        buildContext(jest.fn().mockResolvedValue(okResponse(feed)))
      );

      expect(reports[0].source.url).toBe(FEED_URL);
    }
  );

  // The fingerprint used to be feed URL + guid + title only, so an advisory
  // that kept its guid and title while revising the text deduped away forever.
  describe('revision detection', () => {
    const feedWith = ({ body = 'Body one', pubDate = 'Mon, 12 May 2025 09:30:00 GMT' } = {}) =>
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Acme</title>
  <item>
    <title>Item one</title>
    <guid>acme:1</guid>
    <link>https://acme.example/1</link>
    <pubDate>${pubDate}</pubDate>
    <description>${body}</description>
  </item>
</channel></rss>`;

    const fingerprintFor = async (feed: string) => {
      const reports = await rssAdapter.run(
        buildSource(),
        buildContext(jest.fn().mockResolvedValue(okResponse(feed)))
      );
      return reports[0].content_fingerprint;
    };

    it('is stable when the item is unchanged', async () => {
      expect(await fingerprintFor(feedWith())).toBe(await fingerprintFor(feedWith()));
    });

    it('changes when the body is revised under the same guid and title', async () => {
      expect(await fingerprintFor(feedWith({ body: 'Revised body with new IOCs' }))).not.toBe(
        await fingerprintFor(feedWith())
      );
    });

    it('changes when only the publish timestamp moves', async () => {
      expect(await fingerprintFor(feedWith({ pubDate: 'Wed, 14 May 2025 09:30:00 GMT' }))).not.toBe(
        await fingerprintFor(feedWith())
      );
    });
  });

  it('stamps space_id from the source when set', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(FEED_BODY));
    const reports = await rssAdapter.run(
      buildSource({ space_id: 'team-a' }),
      buildContext(fetchMock)
    );
    expect(reports[0].space_id).toBe('team-a');
  });

  it('returns [] when the source id has no catalog URL', async () => {
    const fetchMock = jest.fn();
    const reports = await rssAdapter.run(
      { _id: 'rss:unknown', _source: { adapter_type: 'rss', name: 'Unknown' } },
      buildContext(fetchMock)
    );
    expect(reports).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on a non-2xx response so the workflow surfaces the failure', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response('boom', { status: 503, statusText: 'Service Unavailable' }));
    await expect(rssAdapter.run(buildSource(), buildContext(fetchMock))).rejects.toThrow(
      /HTTP 503/
    );
  });

  it('returns [] when the feed contains no parseable items', async () => {
    const empty = `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>`;
    const fetchMock = jest.fn().mockResolvedValue(okResponse(empty));
    const reports = await rssAdapter.run(buildSource(), buildContext(fetchMock));
    expect(reports).toEqual([]);
  });
});
