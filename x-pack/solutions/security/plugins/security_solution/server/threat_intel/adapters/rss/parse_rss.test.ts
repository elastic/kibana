/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseRssFeed } from './parse_rss';

const RSS2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Acme Threat Research</title>
    <language>en-US</language>
    <item>
      <title>APT-1 campaign</title>
      <link>https://acme.example/posts/apt1</link>
      <guid isPermaLink="false">acme:apt1</guid>
      <pubDate>Mon, 12 May 2025 09:30:00 GMT</pubDate>
      <description><![CDATA[<p>Brief summary of <b>APT-1</b>.</p>]]></description>
    </item>
    <item>
      <title>Ransomware uptick</title>
      <link>https://acme.example/posts/ransom</link>
      <pubDate>Tue, 13 May 2025 10:00:00 GMT</pubDate>
      <description>Plain summary.</description>
    </item>
    <item>
      <!-- intentionally missing every identifier — should be dropped -->
      <description>Orphan item with no id, link, or guid.</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <title>Vendor Labs</title>
  <entry>
    <id>tag:vendor.example,2025:post-1</id>
    <title>Post one</title>
    <link rel="alternate" href="https://vendor.example/post-1"/>
    <updated>2025-05-12T09:30:00Z</updated>
    <summary>Short summary.</summary>
    <content type="html">&lt;p&gt;Long body&lt;/p&gt;</content>
  </entry>
  <entry>
    <id>tag:vendor.example,2025:post-2</id>
    <title>Post two</title>
    <link href="https://vendor.example/post-2"/>
    <published>2025-05-11T08:00:00Z</published>
    <summary>Only a summary.</summary>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://example.com">
    <title>RDF Feed</title>
    <dc:language>en</dc:language>
  </channel>
  <item rdf:about="https://example.com/posts/1">
    <title>RDF Item</title>
    <link>https://example.com/posts/1</link>
    <description>RDF body.</description>
    <dc:date>2025-05-12T09:30:00Z</dc:date>
  </item>
</rdf:RDF>`;

describe('parseRssFeed', () => {
  it('returns an empty result for an empty input', async () => {
    const parsed = await parseRssFeed('');
    expect(parsed).toEqual({ feedTitle: '', entries: [] });
  });

  it('parses an RSS 2.0 feed and drops items without an identifier', async () => {
    const parsed = await parseRssFeed(RSS2);
    expect(parsed.feedTitle).toBe('Acme Threat Research');
    expect(parsed.language).toBe('en');
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toMatchObject({
      id: 'acme:apt1',
      title: 'APT-1 campaign',
      link: 'https://acme.example/posts/apt1',
      publishedAt: new Date('Mon, 12 May 2025 09:30:00 GMT').toISOString(),
    });
    // CDATA contents preserved as-is on the markup body.
    expect(parsed.entries[0].body).toMatchObject({ kind: 'markup' });
    expect((parsed.entries[0].body as { html: string }).html).toContain('<b>APT-1</b>');
  });

  it('parses an Atom feed and prefers updated over published', async () => {
    const parsed = await parseRssFeed(ATOM);
    expect(parsed.feedTitle).toBe('Vendor Labs');
    expect(parsed.language).toBe('en');
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].publishedAt).toBe('2025-05-12T09:30:00.000Z');
    expect(parsed.entries[0].link).toBe('https://vendor.example/post-1');
    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>Long body</p>' });
    expect(parsed.entries[1].publishedAt).toBe('2025-05-11T08:00:00.000Z');
    // Second entry has no `type` on its <summary>, which defaults to `text` per RFC 4287 —
    // literal text, not markup, so it is classified `text` and never run through the
    // fragment-to-text conversion.
    expect(parsed.entries[1].body).toEqual({ kind: 'text', text: 'Only a summary.' });
  });

  it('parses an RDF / RSS 1.0 feed using rdf:about as the id', async () => {
    const parsed = await parseRssFeed(RDF);
    expect(parsed.feedTitle).toBe('RDF Feed');
    expect(parsed.language).toBe('en');
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]).toMatchObject({
      id: 'https://example.com/posts/1',
      title: 'RDF Item',
      link: 'https://example.com/posts/1',
      publishedAt: '2025-05-12T09:30:00.000Z',
    });
  });

  it('returns an empty result for an unrecognized root element', async () => {
    const parsed = await parseRssFeed('<?xml version="1.0"?><unknown/>');
    expect(parsed).toEqual({ feedTitle: '', entries: [] });
  });
});

// RSS 2.0 permits an item with a description and no title, and real advisory feeds
// publish them. The description is carried as the entry `body`, so the drop-empty guard
// must keep an item that has a body even when the title is missing.
describe('parseRssFeed — description-only items', () => {
  it('keeps an RSS 2.0 item that has a description but no title', async () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Advisories</title>
    <item>
      <guid>adv-1</guid>
      <description>Threat actor deployed ransomware via 185.220.101.45.</description>
    </item>
  </channel>
</rss>`;

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].id).toBe('adv-1');
    expect(parsed.entries[0].body).toMatchObject({ kind: 'markup' });
    expect((parsed.entries[0].body as { html: string }).html).toContain('ransomware');
  });

  it('still drops an item with no identifier', async () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Advisories</title>
    <item><description>No guid and no link.</description></item>
  </channel>
</rss>`;

    expect((await parseRssFeed(feed)).entries).toHaveLength(0);
  });
});

// Namespace resolution for the RSS Content Module: the conventional `content:` prefix is
// accepted unconditionally (real feeds routinely omit the declaration and always mean the
// module), but any other prefix has to actually resolve, via a real `xmlns:` declaration, to
// the module's namespace URI. An aliased prefix that resolves to something else is not the
// Content Module and must not be treated as one.
describe('parseRssFeed — RSS Content Module namespace resolution', () => {
  it('resolves content:encoded under an aliased prefix declared on the root', async () => {
    const feed = `<?xml version="1.0"?>
<rss xmlns:ti="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>F</title>
    <item><guid>1</guid><title>T</title><ti:encoded>&lt;p&gt;full&lt;/p&gt;</ti:encoded></item>
  </channel>
</rss>`;

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>full</p>' });
  });

  it('resolves content:encoded under an alias declared on the element itself', async () => {
    const feed = `<?xml version="1.0"?>
<rss>
  <channel>
    <title>F</title>
    <item><guid>1</guid><title>T</title>
      <ti:encoded xmlns:ti="http://purl.org/rss/1.0/modules/content/">&lt;p&gt;full&lt;/p&gt;</ti:encoded>
    </item>
  </channel>
</rss>`;

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>full</p>' });
  });

  it('accepts the conventional content: prefix even when undeclared', async () => {
    const feed = `<?xml version="1.0"?>
<rss>
  <channel>
    <title>F</title>
    <item><guid>1</guid><title>T</title><content:encoded>&lt;p&gt;full&lt;/p&gt;</content:encoded></item>
  </channel>
</rss>`;

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>full</p>' });
  });

  it('does not treat an aliased prefix bound to an unrelated namespace as the Content Module', async () => {
    const feed = `<?xml version="1.0"?>
<rss xmlns:foo="urn:literal">
  <channel>
    <title>F</title>
    <item><guid>1</guid><title>T</title><description>fallback</description><foo:encoded>not the module</foo:encoded></item>
  </channel>
</rss>`;

    const parsed = await parseRssFeed(feed);

    // Falls back to <description>, since the aliased <foo:encoded> did not resolve.
    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: 'fallback' });
  });

  it('resolves content:encoded on the RDF / RSS 1.0 branch too', async () => {
    const feed = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel><title>F</title></channel>
  <item rdf:about="https://example.com/1">
    <title>T</title>
    <description>summary only</description>
    <content:encoded>&lt;p&gt;full RDF body&lt;/p&gt;</content:encoded>
  </item>
</rdf:RDF>`;

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>full RDF body</p>' });
  });
});

// Atom's `type=` attribute decides whether <content>/<summary> is literal text, entity-encoded
// HTML, or inline XML markup. Ignoring it either mislabels plain text as HTML or — for
// type="xhtml" — silently drops the real child markup, since a plain-text extraction of that
// node only sees the (mostly empty) text between the child elements.
describe('parseRssFeed — Atom content-type resolution', () => {
  const entryWith = (contentOrSummary: string) => `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>F</title>
  <entry><id>1</id><title>T</title>${contentOrSummary}</entry>
</feed>`;

  it('keeps a text-typed summary literal, not markup', async () => {
    const feed = entryWith(
      '<summary type="text">Exploit uses &lt;script&gt; and c2.evil.test</summary>'
    );

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({
      kind: 'text',
      text: 'Exploit uses <script> and c2.evil.test',
    });
  });

  it('keeps an untyped content literal, since the default is text', async () => {
    const feed = entryWith('<content>Exploit uses &lt;script&gt; and c2.evil.test</content>');

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({
      kind: 'text',
      text: 'Exploit uses <script> and c2.evil.test',
    });
  });

  it('captures type="xhtml" child markup instead of dropping it', async () => {
    const feed = entryWith(
      '<content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">' +
        '<p>evil.com</p><p>bad.net</p></div></content>'
    );

    const parsed = await parseRssFeed(feed);

    // The xhtml:div wrapper is real structural markup and is kept — text.ts's block
    // boundary handling treats it like any other <div>, so this changes nothing about
    // the extracted IOCs.
    expect(parsed.entries[0].body).toEqual({
      kind: 'markup',
      html: '<div><p>evil.com</p><p>bad.net</p></div>',
    });
  });

  it('treats a text/html media type on content as markup', async () => {
    const feed = entryWith('<content type="text/html">&lt;p&gt;evil.com&lt;/p&gt;</content>');

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>evil.com</p>' });
  });

  it('treats an application/xhtml+xml media type on content as inline XML', async () => {
    const feed = entryWith(
      '<content type="application/xhtml+xml"><div xmlns="http://www.w3.org/1999/xhtml">' +
        '<p>evil.com</p></div></content>'
    );

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<div><p>evil.com</p></div>' });
  });

  it('treats a non-html media type as literal text', async () => {
    const feed = entryWith(
      '<content type="text/plain">Exploit uses &lt;script&gt; and c2.evil.test</content>'
    );

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({
      kind: 'text',
      text: 'Exploit uses <script> and c2.evil.test',
    });
  });

  it('prefers content over summary when both are present', async () => {
    const feed = entryWith(
      '<summary>short</summary><content type="html">&lt;p&gt;full&lt;/p&gt;</content>'
    );

    const parsed = await parseRssFeed(feed);

    expect(parsed.entries[0].body).toEqual({ kind: 'markup', html: '<p>full</p>' });
  });
});
