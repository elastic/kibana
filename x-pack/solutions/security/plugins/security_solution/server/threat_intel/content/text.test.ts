/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildReportContent,
  collapseWhitespace,
  htmlToStructured,
  stripHtml,
  truncate,
  MAX_PARSE_BYTES,
} from './text';

describe('stripHtml', () => {
  it('returns an empty string for nullish input', () => {
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml('')).toBe('');
  });

  it('drops <script> and <style> bodies before tag stripping', () => {
    const html = `<p>before</p><script>alert("xss")</script><style>body{color:red}</style><p>after</p>`;
    const result = stripHtml(html);
    expect(result).toBe('before after');
  });

  it('drops script bodies whose end tag carries whitespace or junk', () => {
    for (const closeTag of ['</script >', '</script\t\n bar>', '</script foo="1">']) {
      const result = stripHtml(`<p>before</p><script>alert("xss")${closeTag}<p>after</p>`);
      expect(result).not.toContain('alert');
      expect(result).toBe('before after');
    }
  });

  it('decodes the named entities feeds use most often', () => {
    const html = '<p>&copy;&nbsp;Acme &mdash; &ldquo;hello&rdquo;</p>';
    expect(stripHtml(html)).toBe('\u00a9 Acme \u2014 \u201chello\u201d');
  });

  it('decodes numeric (decimal and hex) entities', () => {
    expect(stripHtml('&#65; &#x42;')).toBe('A B');
  });

  it('collapses whitespace runs introduced by tag-stripping', () => {
    expect(stripHtml('<p>a</p>\n<p>  b  </p>')).toBe('a b');
  });
});

describe('collapseWhitespace', () => {
  it('replaces runs of whitespace (including unicode separators) with a single space', () => {
    expect(collapseWhitespace('  hello\n\tworld\u2028!  ')).toBe('hello world !');
  });
});

describe('truncate', () => {
  it('returns the input unchanged when shorter than max', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('appends an ellipsis when truncated', () => {
    // Nine characters plus the ellipsis, so the result is exactly the cap. Slicing to
    // maxLength and then appending put every truncated value one over.
    expect(truncate('a'.repeat(50), 10)).toBe('aaaaaaaaa\u2026');
  });

  // The bound is what callers pass to satisfy a downstream length check, so a result
  // one character over defeats the point of truncating at all.
  it.each([1, 2, 5, 10, 64, 1024])('never exceeds the cap of %i', (cap) => {
    expect(truncate('a'.repeat(5000), cap).length).toBeLessThanOrEqual(cap);
  });

  it.each([1, 2, 5, 10, 64, 1024])('never exceeds the cap of %i with word boundaries', (cap) => {
    expect(truncate('word '.repeat(1000), cap).length).toBeLessThanOrEqual(cap);
  });

  it('returns empty for a zero or negative cap rather than a bare ellipsis', () => {
    expect(truncate('anything', 0)).toBe('');
    expect(truncate('anything', -5)).toBe('');
  });

  it('respects a word boundary close to the cap', () => {
    // The boundary heuristic only honors `lastIndexOf(' ')` when it
    // lands past 60% of the cap. For maxLength=12, the heuristic
    // requires a space at index >= 7.2; the trailing space at index 11
    // (after "hello world") qualifies, so we cut on that boundary.
    const input = 'hello world goodbye';
    expect(truncate(input, 12)).toBe('hello world\u2026');
  });

  it('falls back to a hard cut when the boundary is too far back', () => {
    // The "word" is the entire string, so there's no boundary close
    // to the cap. The hard cut wins.
    const input = 'noboundariesatallnoboundariesatall';
    // Four characters of content plus the ellipsis, so five total.
    expect(truncate(input, 5)).toBe('nobo\u2026');
  });
});

describe('htmlToStructured', () => {
  it('returns empty string for nullish input', () => {
    expect(htmlToStructured(undefined)).toBe('');
    expect(htmlToStructured(null)).toBe('');
    expect(htmlToStructured('')).toBe('');
  });

  it('converts an IOC table so header labels and values appear on recoverable rows', () => {
    const html = `
      <table>
        <tr><th>Type</th><th>Indicator</th></tr>
        <tr><td>Domain</td><td>evil[.]com</td></tr>
        <tr><td>IP</td><td>192.0.2.1</td></tr>
      </table>
    `;
    const result = htmlToStructured(html);
    // Header row must survive as pipe-delimited
    expect(result).toContain('Type | Indicator');
    // Value rows must survive — domain and IP on recoverable lines
    expect(result).toContain('Domain | evil[.]com');
    expect(result).toContain('IP | 192.0.2.1');
    // Must NOT be collapsed into a single space-run (the stripHtml failure mode)
    expect(result).not.toMatch(/Type\s+Indicator\s+Domain\s+evil/);
  });

  it('converts headings to ## prefix', () => {
    const html = '<h2>Indicators of Compromise</h2><p>See table below.</p>';
    const result = htmlToStructured(html);
    expect(result).toContain('## Indicators of Compromise');
  });

  it('converts list items to - prefix', () => {
    const html = '<ul><li>evil.com</li><li>bad.net</li></ul>';
    const result = htmlToStructured(html);
    expect(result).toContain('- evil.com');
    expect(result).toContain('- bad.net');
  });

  it('drops prose anchor hrefs (collapses to visible text only)', () => {
    // Prose <a href> links are clickable citations, not IOCs. Dropping hrefs prevents
    // reference-noise URLs from flooding anchor-eligible extraction. Real inline IOCs
    // appear as defanged literal text in prose and are extracted via the regex path.
    const html = '<p>See <a href="https://learn.microsoft.com/docs">this link</a> for details.</p>';
    const result = htmlToStructured(html);
    expect(result).not.toContain('https://learn.microsoft.com/docs');
    expect(result).toContain('this link');
  });

  it('lifts anchor href URLs as plain text inside an IOC section', () => {
    // Hrefs ARE lifted inside IOC and References heading sections (the original
    // motivation for the lift: capture citation URLs in References, C2 links in IOC tables).
    const html =
      '<h2>Indicators of Compromise</h2><p>See <a href="https://c2.evil.com/beacon">this link</a>.</p>';
    const result = htmlToStructured(html);
    expect(result).toContain('https://c2.evil.com/beacon');
  });

  it('strips script and style bodies', () => {
    const html = '<script>alert(1)</script><p>safe</p><style>body{}</style>';
    const result = htmlToStructured(html);
    expect(result).toContain('safe');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('body{}');
  });

  it('strips script bodies whose end tag carries whitespace or junk', () => {
    for (const closeTag of ['</script >', '</script\t\n bar>', '</script foo="1">']) {
      const result = htmlToStructured(`<script>alert(1)${closeTag}<p>safe</p>`);
      expect(result).toContain('safe');
      expect(result).not.toContain('alert');
    }
  });

  it('leaves no reassembled tag from nested angle brackets', () => {
    const result = htmlToStructured('<scr<script>ipt>payload');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<scr');
  });

  it('decodes HTML entities in structured output', () => {
    const html = '<p>server at 10[.]0[.]0[.]1 &mdash; evil&amp;co.com</p>';
    const result = htmlToStructured(html);
    expect(result).toContain('—'); // mdash decoded
    expect(result).toContain('evil&co.com'); // &amp; decoded
  });

  it('does not produce markdown link [label](url) syntax in IOC sections', () => {
    const html =
      '<h2>Indicators of Compromise</h2><a href="https://c2.evil.com/beacon">click here</a>';
    const result = htmlToStructured(html);
    expect(result).not.toMatch(/\[.*\]\(.*\)/);
    // href still present as plain text in the IOC section
    expect(result).toContain('https://c2.evil.com/beacon');
  });

  it('preserves anchor href URL inside a list item in References section (anchor-lift ordering fix)', () => {
    // Href-lift must run before <li> processing so the URL survives the inner-tag strip.
    // This test verifies the fix in a References heading context (where href-lift is active).
    const html =
      '<h2>References</h2><ul><li><a href="https://socket.dev/blog">Socket writeup</a></li></ul>';
    const result = htmlToStructured(html);
    expect(result).toContain('https://socket.dev/blog');
  });

  it('drops prose anchor href but collapses to anchor text in list items', () => {
    // Without a heading context, <a href> collapses to visible text only.
    const html = '<ul><li><a href="https://blog.example.com/nav">Read more</a></li></ul>';
    const result = htmlToStructured(html);
    expect(result).not.toContain('https://blog.example.com/nav');
    expect(result).toContain('Read more');
  });

  it('preserves multi-column IOC table structure for downstream regex extraction', () => {
    // Realistic vendor HTML snippet: Type/Indicator columns
    const html = `
      <table>
        <thead><tr><th>Indicator Type</th><th>Value</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Domain</td><td>c2.attacker[.]top</td><td>Stage 2 C2</td></tr>
          <tr><td>IP Address</td><td>198.51.100[.]42</td><td>Pivot host</td></tr>
          <tr><td>Hash (MD5)</td><td>d41d8cd98f00b204e9800998ecf8427e</td><td>Loader</td></tr>
        </tbody>
      </table>
    `;
    const result = htmlToStructured(html);
    // Each row must be on its own line with | separators
    const lines = result.split('\n');
    const domainRow = lines.find((l) => l.includes('c2.attacker[.]top'));
    const ipRow = lines.find((l) => l.includes('198.51.100[.]42'));
    const hashRow = lines.find((l) => l.includes('d41d8cd98f00b204e9800998ecf8427e'));
    expect(domainRow).toBeDefined();
    expect(ipRow).toBeDefined();
    expect(hashRow).toBeDefined();
    // Values must not be merged onto a single line
    expect(domainRow).not.toContain('198.51.100');
    expect(ipRow).not.toContain('d41d8cd98f00b204e9800998ecf8427e');
  });
});

describe('buildReportContent', () => {
  it('builds the strict-mapping content block without bm25 siblings', () => {
    expect(
      buildReportContent({
        title: 'Ransomware uptick',
        bodyText: 'Campaign details',
        language: 'en',
      })
    ).toEqual({
      title: 'Ransomware uptick',
      body_text: 'Campaign details',
      language: 'en',
    });
    expect(
      buildReportContent({
        title: 'Advisory',
        bodyText: 'Details',
        bodyHtml: '<p>Details</p>',
      })
    ).toEqual({
      title: 'Advisory',
      body_text: 'Details',
      body_html: '<p>Details</p>',
      language: 'en',
    });
  });
});

// A report stored with no body can never be enriched: every enrichment route
// requires a non-empty text, so it stays pending, load_pending_reports keeps
// picking it up, and it occupies a slot in the scheduled batch indefinitely.
describe('buildReportContent — empty body fallback', () => {
  it('falls back to the title when the body is empty', () => {
    const content = buildReportContent({ title: 'Ransomware advisory', bodyText: '' });
    expect(content.body_text).toBe('Ransomware advisory');
  });

  it('falls back when the body is only whitespace', () => {
    const content = buildReportContent({ title: 'Ransomware advisory', bodyText: '   \n  ' });
    expect(content.body_text).toBe('Ransomware advisory');
  });

  it('leaves a real body alone', () => {
    const content = buildReportContent({ title: 'Title', bodyText: 'Real body text.' });
    expect(content.body_text).toBe('Real body text.');
  });
});

// ── Review fixes ─────────────────────────────────────────────────────────────

describe('htmlToStructured — heading classification', () => {
  // `Indicators&nbsp;of&nbsp;Compromise` is an entirely ordinary heading. Classifying
  // the raw form read it as prose, so anchor hrefs under it were dropped rather than
  // lifted, losing href-only indicators.
  it('classifies a heading whose words are separated by entities', () => {
    const html =
      '<h2>Indicators&nbsp;of&nbsp;Compromise</h2><ul><li><a href="https://c2.evil.test/b">beacon</a></li></ul>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/b');
  });

  // `<h2>IOC</h2><h3>Domains</h3>` used to fall back to prose at `Domains`, dropping
  // every href in the subsection that actually holds the indicators.
  it('keeps an IOC section through an unclassified deeper subsection', () => {
    const html =
      '<h2>Indicators of Compromise</h2><h3>Domains</h3><ul><li><a href="https://evil.test/x">x</a></li></ul>';
    expect(htmlToStructured(html)).toContain('https://evil.test/x');
  });

  it('ends the IOC section at a same-level heading', () => {
    const html =
      '<h2>Indicators of Compromise</h2><h2>Attribution</h2><ul><li><a href="https://blog.test/p">p</a></li></ul>';
    expect(htmlToStructured(html)).not.toContain('https://blog.test/p');
  });

  it('ends the IOC section at an explicit terminator, even a deeper one', () => {
    const html =
      '<h2>Indicators of Compromise</h2><h3>References</h3><ul><li><a href="https://vendor.test/r">r</a></li></ul>';
    // References is classified, so it wins over subsection inheritance. The href is
    // still lifted (references sections lift too) but as a reference, not an IOC.
    expect(htmlToStructured(html)).toContain('https://vendor.test/r');
  });

  // Unquoted href is valid HTML, and without support the generic tag stripper
  // removed the attribute so an href-only IOC vanished entirely.
  it('lifts an unquoted href', () => {
    const html =
      '<h2>Indicators of Compromise</h2><p><a href=https://c2.evil.test/beacon>indicator</a></p>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/beacon');
  });

  it('still lifts a quoted href', () => {
    const html = '<h2>IOCs</h2><p><a href="https://c2.evil.test/q">indicator</a></p>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/q');
  });
});

describe('parser input bounds', () => {
  // These take fetched pages, so the input is attacker-influenced and unbounded, and
  // this runs in a task worker. Truncating degrades a fat page instead of failing it.
  it('caps a huge input rather than parsing all of it', () => {
    const huge = `<p>${'a'.repeat(MAX_PARSE_BYTES + 5000)}</p>`;
    const out = stripHtml(huge);
    expect(out.length).toBeLessThanOrEqual(MAX_PARSE_BYTES);
  });

  it('leaves a normal document untouched', () => {
    expect(stripHtml('<p>hello</p>')).toBe('hello');
  });
});

describe('buildReportContent — title fallback is observable', () => {
  // Without the flag the document is indistinguishable from one that genuinely
  // repeats its title, so enrichment pays to run inference over the same string
  // twice with no way to know the input is only a headline.
  it('flags a title fallback', () => {
    const content = buildReportContent({ title: 'Ransomware advisory', bodyText: '' });
    expect(content.body_text).toBe('Ransomware advisory');
    expect(content.body_is_title_fallback).toBe(true);
  });

  it('omits the flag when the body is real', () => {
    const content = buildReportContent({ title: 'T', bodyText: 'Real body.' });
    expect(content.body_is_title_fallback).toBeUndefined();
  });
});

describe('htmlToStructured — anchor attribute boundaries', () => {
  // Without a real attribute boundary the greedy prefix could run past
  // `data-href="..."` and lift the tracker instead of the link, which in an IOC
  // section both loses the indicator and invents a false one.
  it('lifts href, not data-href', () => {
    const html =
      '<h2>IOCs</h2><p><a href="https://c2.evil.test/real" data-href="https://tracker.test/x">IOC</a></p>';
    const out = htmlToStructured(html);
    expect(out).toContain('https://c2.evil.test/real');
    expect(out).not.toContain('https://tracker.test/x');
  });

  it('lifts href when data-href comes first', () => {
    const html =
      '<h2>IOCs</h2><p><a data-href="https://tracker.test/x" href="https://c2.evil.test/real">IOC</a></p>';
    const out = htmlToStructured(html);
    expect(out).toContain('https://c2.evil.test/real');
    expect(out).not.toContain('https://tracker.test/x');
  });

  it('does not treat a data-href-only anchor as a link', () => {
    const html = '<h2>IOCs</h2><p><a data-href="https://tracker.test/x">not a link</a></p>';
    expect(htmlToStructured(html)).not.toContain('https://tracker.test/x');
  });

  it('tolerates whitespace around the equals sign', () => {
    const html = '<h2>IOCs</h2><p><a href = "https://c2.evil.test/spaced">IOC</a></p>';
    expect(htmlToStructured(html)).toContain('https://c2.evil.test/spaced');
  });
});

describe('stripHtml — entity table lookup safety', () => {
  // A bare object literal inherits Object.prototype, so these names resolved to
  // functions and the `!== undefined` guard treated them as valid replacements,
  // injecting `function Object() { [native code] }` into the report body from
  // untrusted feed HTML.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'])(
    'leaves &%s; alone instead of resolving a prototype member',
    (name) => {
      const out = stripHtml(`<p>value &${name}; here</p>`);
      expect(out).toBe(`value &${name}; here`);
      expect(out).not.toContain('native code');
      expect(out).not.toContain('[object Object]');
    }
  );

  it('still decodes the real named entities', () => {
    expect(stripHtml('<p>a &amp; b &nbsp; c &hellip;</p>')).toBe('a & b c \u2026');
  });

  it('still decodes numeric and hex entities', () => {
    expect(stripHtml('<p>&#65;&#x42;</p>')).toBe('AB');
  });

  // The point of this case is that an out-of-range reference cannot crash extraction.
  // The regex decoder guarded `String.fromCodePoint` by leaving the reference as
  // literal text; the parser instead substitutes U+FFFD, which is what the HTML spec
  // requires and what a browser shows. Either way the input is survivable, and no
  // reference escapes as something that could be re-read as markup.
  it('replaces an out-of-range code point rather than throwing', () => {
    expect(stripHtml('<p>&#9999999;</p>')).toBe('\ufffd');
  });
});

describe('script and style removal without a closing tag', () => {
  // The bigger source of these is not malformed feeds, it is `capInput`: a valid
  // document truncated at MAX_PARSE_BYTES can lose the closing tag, and the generic
  // tag stripper then removes only the opening tag and leaves the whole body as
  // report text, which goes to the LLM stages and IOC extraction.
  it('discards an unterminated script through end of input', () => {
    expect(stripHtml('<p>before</p><script>alert(1)')).toBe('before');
  });

  it('discards an unterminated style through end of input', () => {
    expect(stripHtml('<p>before</p><style>.c { color: red; }')).toBe('before');
  });

  it('still keeps a sibling after a terminated script', () => {
    expect(stripHtml('<p>a</p><script>x</script><p>b</p>')).toBe('a b');
  });

  it('handles a terminated script followed by an unterminated one', () => {
    expect(stripHtml('<p>a</p><script>x</script><p>b</p><script>y')).toBe('a b');
  });

  it('applies to the structured path too', () => {
    const out = htmlToStructured('<p>before</p><script>var leak = "aaaa";');
    expect(out).not.toContain('leak');
    expect(out).toContain('before');
  });

  // The realistic route: truncation cuts a valid script mid-body.
  it('does not leak a script body that the input cap truncated', () => {
    const html = `<p>before</p><script>${'var x = 1; '.repeat(20)}`;
    const capped = `${html.slice(0, 80)}`;
    expect(stripHtml(capped)).toBe('before');
  });
});

describe('stripHtml — prose containing angle brackets', () => {
  // A bare `<[^>]+>` treated any `<...>` span as a tag, so a comparison in prose was
  // eaten whole. Threat reports are full of `payload < 4KB` and `CVSS > 7`.
  it('keeps a comparison between two numbers', () => {
    expect(stripHtml('<p>5 < 10 and 3 > 1</p>')).toBe('5 < 10 and 3 > 1');
  });

  it('keeps a size threshold', () => {
    expect(stripHtml('<p>payload < 4KB, CVSS > 7.5</p>')).toBe('payload < 4KB, CVSS > 7.5');
  });

  it('still removes real tags around it', () => {
    expect(stripHtml('<div><span>a < b</span></div>')).toBe('a < b');
  });

  it('still removes comments and processing instructions', () => {
    expect(stripHtml('<!-- note --><p>body</p>')).toBe('body');
  });

  it('still removes a closing tag', () => {
    expect(stripHtml('<p>text</p>')).toBe('text');
  });
});

describe('script/style removal respects exact tag names', () => {
  // `\b` also matches before a hyphen, so a valid custom element was read as an
  // unterminated `<script>` and the end-of-input pass discarded the entire rest of the
  // document, report body and IOCs included.
  it('does not treat a custom element as an unterminated script', () => {
    const out = stripHtml('<p>before</p><script-loader></script-loader><p>c2.evil.test</p>');
    expect(out).toContain('c2.evil.test');
    expect(out).toContain('before');
  });

  it('does not treat a custom style element as an unterminated style', () => {
    const out = stripHtml('<p>before</p><style-sheet></style-sheet><p>c2.evil.test</p>');
    expect(out).toContain('c2.evil.test');
  });

  it('still removes a real terminated script', () => {
    expect(stripHtml('<p>a</p><script>x</script><p>b</p>')).toBe('a b');
  });

  it('still removes a real unterminated script', () => {
    expect(stripHtml('<p>a</p><script>leak')).toBe('a');
  });

  it('still removes a script with attributes', () => {
    expect(stripHtml('<p>a</p><script type="text/javascript">x</script><p>b</p>')).toBe('a b');
  });

  // This assertion used to check only that the *preceding* text survived, which is why
  // it passed while every following sibling was being discarded. The content after the
  // tag is the part that matters.
  it('removes a self-closing script without dropping what follows', () => {
    expect(stripHtml('<p>a</p><script/><p>b</p>')).toBe('a b');
  });

  it('removes a self-closing script with attributes without dropping what follows', () => {
    expect(stripHtml('<p>a</p><script src="x.js"/><p>c2.evil.test</p>')).toBe('a c2.evil.test');
  });

  it('removes a self-closing style without dropping what follows', () => {
    expect(stripHtml('<p>a</p><style/><p>b</p>')).toBe('a b');
  });
});

describe('tag stripping is idempotent', () => {
  // A single pass is not enough: removing a tag can reassemble a new one from the text
  // on either side. CodeQL flags single-pass tag removal for this reason.
  it.each([
    ['single reassembly', '<scr<script>ipt>payload'],
    ['double reassembly', '<scr<scr<script>ipt>ipt>payload'],
    ['triple reassembly', '<scr<scr<scr<script>ipt>ipt>ipt>payload'],
  ])('leaves no script tag after %s', (_label, input) => {
    const out = stripHtml(input);
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('<scr');
  });

  it('leaves no tag-like fragment even on deeply adversarial nesting', () => {
    const input = `${'<scr'.repeat(20)}<script>${'ipt>'.repeat(20)}payload`;
    const out = stripHtml(input);
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('<scr');
  });

  it('still leaves ordinary prose comparisons alone', () => {
    expect(stripHtml('<p>5 < 10 and 3 > 1</p>')).toBe('5 < 10 and 3 > 1');
  });

  it('is stable, so a second pass over the output changes nothing', () => {
    const once = stripHtml('<scr<script>ipt>payload <p>text</p>');
    expect(stripHtml(once)).toBe(once);
  });
});

describe('htmlToStructured — implicit end tags', () => {
  // HTML permits omitting </li>, </td>, </th> and </tr>. Requiring them made compact
  // vendor markup fall through to generic tag removal, running adjacent indicators
  // together into one token that no IOC pattern can match.
  it('separates list items with omitted </li>', () => {
    const out = htmlToStructured('<h2>IOCs</h2><ul><li>evil.com<li>bad.net</ul>');
    expect(out).not.toContain('evil.combad.net');
    expect(out).toContain('evil.com');
    expect(out).toContain('bad.net');
  });

  it('still handles fully closed list items', () => {
    const out = htmlToStructured('<h2>IOCs</h2><ul><li>evil.com</li><li>bad.net</li></ul>');
    expect(out).toContain('evil.com');
    expect(out).toContain('bad.net');
  });

  it('separates table cells with omitted </td>', () => {
    const out = htmlToStructured('<h2>IOCs</h2><table><tr><td>evil.com<td>bad.net</tr></table>');
    expect(out).not.toContain('evil.combad.net');
    expect(out).toContain('evil.com');
    expect(out).toContain('bad.net');
  });

  it('separates rows with omitted </tr>', () => {
    const out = htmlToStructured('<h2>IOCs</h2><table><tr><td>evil.com<tr><td>bad.net</table>');
    expect(out).toContain('evil.com');
    expect(out).toContain('bad.net');
    expect(out).not.toContain('evil.combad.net');
  });

  it('still handles fully closed tables', () => {
    const out = htmlToStructured(
      '<h2>IOCs</h2><table><tr><td>evil.com</td><td>bad.net</td></tr></table>'
    );
    expect(out).toContain('evil.com');
    expect(out).toContain('bad.net');
  });
});

describe('stripHtml — HTML comments are removed as whole nodes', () => {
  // The generic tag pattern stops at the first `>`, so a comment containing one leaked
  // its contents into report text. A commented-out indicator then becomes a live IOC.
  it('removes a comment containing a greater-than sign', () => {
    expect(stripHtml('before<!-- hidden > c2.evil.test -->after')).toBe('before after');
  });

  it('does not leak a commented-out indicator into the text', () => {
    expect(stripHtml('<p>real.test</p><!-- old > commented.test -->')).not.toContain(
      'commented.test'
    );
  });

  it('removes an ordinary comment', () => {
    expect(stripHtml('before<!-- note -->after')).toBe('before after');
  });

  it('removes an unterminated comment through end of input', () => {
    expect(stripHtml('before<!-- hidden c2.evil.test')).toBe('before');
  });

  it('removes a multiline comment', () => {
    expect(stripHtml('a<!--\n line > one\n line two\n-->b')).toBe('a b');
  });

  it('applies to the structured path too', () => {
    expect(
      htmlToStructured('<h2>IOCs</h2><!-- hidden > commented.test --><p>real.test</p>')
    ).not.toContain('commented.test');
  });
});

/**
 * These four cases are why this file parses HTML instead of pattern-matching it.
 *
 * Each one is a place where "find the tag with a regex" is not just imprecise but
 * wrong in a way that changes what reaches IOC extraction: `[^>]*` cannot know
 * whether a `>` is inside a quoted attribute, and a paired-tag pattern applied
 * globally rescans the suffix from every opener.
 */
describe('markup that only a parser reads correctly', () => {
  describe('a > inside a quoted attribute value is not a tag terminator', () => {
    // `[^>]*` ended the tag at the attribute's `>`, so the rest of the attribute plus
    // the real tag close leaked out as text. In an IOC section that both invents an
    // indicator (`c2.evil.test`) and hands extraction a mangled token.
    it('keeps hidden attribute text out of body_text', () => {
      expect(stripHtml('<p title="score > c2.evil.test">real</p>')).toBe('real');
    });

    it('does not leak the attribute of an unquoted-then-quoted mix', () => {
      expect(stripHtml('<p data-x=1 title="a > b">real</p>')).toBe('real');
    });

    // The heading scanner had its own `[^>]*`, so this silently disabled IOC-section
    // handling: the heading text became `7">Indicators of Compromise`, classified as
    // prose, and every href below it was dropped instead of lifted.
    it('still classifies a heading carrying a quoted >', () => {
      const structured = htmlToStructured(
        '<h2 title="CVSS > 7">Indicators of Compromise</h2><p><a href="http://bad.test/x">link</a></p>'
      );
      expect(structured).toContain('## Indicators of Compromise');
      expect(structured).toContain('http://bad.test/x');
    });
  });

  describe('entity-encoded markup does not survive as markup', () => {
    // RSS and Atom routinely encode a whole HTML body inside <description>. One decode
    // leaves tags sitting in what is supposed to be plain text, which violates the
    // body_text contract and feeds markup to the LLM stages and IOC extraction.
    it('resolves encoded tags to text', () => {
      expect(stripHtml('&lt;p&gt;evil.test&lt;/p&gt;')).toBe('evil.test');
    });

    it('removes an encoded script body rather than keeping its contents', () => {
      expect(stripHtml('&lt;script&gt;fetch("http://c2.evil.test")&lt;/script&gt;ok')).toBe('ok');
    });

    it('applies the same resolution in the structured form', () => {
      expect(htmlToStructured('&lt;p&gt;evil.test&lt;/p&gt;')).toBe('evil.test');
    });

    it('recovers encoded table cells as separate tokens', () => {
      expect(
        htmlToStructured(
          '&lt;tr&gt;&lt;td&gt;evil.com&lt;/td&gt;&lt;td&gt;bad.net&lt;/td&gt;&lt;/tr&gt;'
        )
      ).toBe('| evil.com | bad.net |');
    });

    // The guard that keeps the re-parse from eating prose. A report explaining a
    // technique mentions tags without closing them, and that text has to survive: the
    // re-parse only runs when the decoded text contains a closing tag.
    it('leaves prose that merely mentions a tag alone', () => {
      expect(stripHtml('<p>use &lt;script&gt; carefully</p>')).toBe('use <script> carefully');
    });

    it('does not recurse past one re-parse', () => {
      // Doubly-encoded input resolves one level per pass and then stops, so the second
      // level is preserved as text rather than being chased to a fixpoint.
      expect(stripHtml('&amp;lt;p&amp;gt;evil.test&amp;lt;/p&amp;gt;')).toBe(
        '&lt;p&gt;evil.test&lt;/p&gt;'
      );
    });
  });

  /**
   * Timing assertions, deliberately with a wide margin.
   *
   * The bounds are ~100x the measured cost, so they are not sensitive to a slow or
   * contended CI worker, but a return to quadratic behavior overruns them by orders of
   * magnitude. These inputs sit well inside MAX_PARSE_BYTES, so a quadratic path here is
   * reachable by any feed and pegs a task worker rather than merely being slow.
   */
  describe('adversarial markup stays linear', () => {
    it('handles many unterminated script openers', () => {
      // The old paired-tag pattern restarted at each opener and scanned the remaining
      // suffix for an absent `</script>`: 486ms at 480KB, and ~21s at this size.
      const input = '<script>'.repeat(400000);
      const started = process.hrtime.bigint();
      const result = stripHtml(input);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

      expect(result).toBe('');
      expect(elapsedMs).toBeLessThan(5000);
    });

    it('handles deeply nested elements without recursing', () => {
      // Two separate hazards: a recursive walk would exhaust the call stack, and
      // resolving script/style with a CSS selector was quadratic in depth (2.6s here).
      const input = `${'<div>'.repeat(100000)}evil.test`;
      const started = process.hrtime.bigint();
      const result = stripHtml(input);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

      expect(result).toBe('evil.test');
      expect(elapsedMs).toBeLessThan(5000);
    });

    it('keeps the structured form linear over the same input', () => {
      const input = `${'<div>'.repeat(100000)}evil.test`;
      const started = process.hrtime.bigint();
      const result = htmlToStructured(input);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

      expect(result).toBe('evil.test');
      expect(elapsedMs).toBeLessThan(5000);
    });
  });
});

/**
 * Inline markup must not create a token boundary.
 *
 * Threat reports split indicators across inline formatting constantly, and the regex
 * implementation could not tell an inline element from a block one: it substituted a
 * space for every tag, so `c2.<strong>evil</strong>.test` reached IOC extraction as
 * `c2. evil .test` and the domain was never matched. Preserved here as an allowlist, so
 * an unknown or custom element still yields a boundary; a spurious boundary splits one
 * token, a missing one merges two indicators into an unextractable value.
 */
describe('inline markup does not split tokens', () => {
  it.each([
    ['strong inside a domain', '<p>c2.<strong>evil</strong>.test</p>', 'c2.evil.test'],
    ['bold separator', '<p>evil<b>.</b>com</p>', 'evil.com'],
    ['span mid-token', '<p>evi<span>l</span>.com</p>', 'evil.com'],
    ['code mid-token', '<p>evil<code>.</code>com</p>', 'evil.com'],
    ['anchor mid-token', '<p>c2.<a href="http://x">evil</a>.test</p>', 'c2.evil.test'],
  ])('keeps %s intact', (_label, html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  it.each([
    ['paragraphs', '<p>evil.com</p><p>bad.net</p>'],
    ['table cells', '<tr><td>evil.com</td><td>bad.net</td></tr>'],
    ['list items', '<ul><li>evil.com<li>bad.net</ul>'],
    ['line breaks', 'evil.com<br>bad.net'],
    ['divs', '<div>evil.com</div><div>bad.net</div>'],
    ['comments', 'evil.com<!-- x -->bad.net'],
    ['unknown elements', '<my-widget>evil.com</my-widget><my-widget>bad.net</my-widget>'],
  ])('still separates %s', (_label, html) => {
    expect(stripHtml(html)).toBe('evil.com bad.net');
  });

  it('keeps inline content joined inside a table cell', () => {
    expect(htmlToStructured('<tr><td>evi<span>l</span>.com</td><td>bad.net</td></tr>')).toBe(
      '| evil.com | bad.net |'
    );
  });
});

/**
 * CDATA carries an HTML document, not a comment.
 *
 * HTML treats `<![CDATA[ ... ]]>` as a bogus comment, which is correct for a web page and
 * wrong for a feed: RSS and Atom use it precisely to ship article content. Read as a
 * comment, the entire body was discarded and the report reached enrichment empty.
 */
describe('CDATA payloads', () => {
  it('extracts text from a CDATA article body', () => {
    expect(stripHtml('<description><![CDATA[<p>IOC: evil.test</p>]]></description>')).toBe(
      'IOC: evil.test'
    );
  });

  it('keeps structure from a CDATA article body', () => {
    expect(
      htmlToStructured(
        '<description><![CDATA[<h2>Indicators of Compromise</h2><p>evil.test</p>]]></description>'
      )
    ).toBe('## Indicators of Compromise\nevil.test');
  });

  it('preserves table cell boundaries inside CDATA', () => {
    expect(
      htmlToStructured(
        '<description><![CDATA[<tr><td>evil.com</td><td>bad.net</td></tr>]]></description>'
      )
    ).toBe('| evil.com | bad.net |');
  });

  // The payload is parsed, so script bodies inside it are removed as elements rather than
  // surfacing as text that extraction would mine for IOCs.
  it('removes a script carried inside CDATA', () => {
    expect(stripHtml('<description><![CDATA[<script>bad()</script>ok]]></description>')).toBe('ok');
  });

  // Enabling CDATA recognition must not turn ordinary comments into content.
  it('still discards ordinary comments', () => {
    expect(stripHtml('visible<!-- hidden > c2.evil.test -->text')).toBe('visible text');
  });
});

/**
 * Escaped markup is also how a report displays markup on purpose.
 *
 * A single decode cannot tell an entity-encoded document from a snippet the author chose
 * to show, so re-parse eligibility is decided from whether the input brought markup of
 * its own. Re-parsing unconditionally deleted the escaped script in a `<code>` block and
 * with it the IOC the report was published to communicate.
 */
describe('re-parsing entity-encoded markup', () => {
  it('keeps an escaped snippet displayed inside real markup', () => {
    expect(
      stripHtml(`<code>&lt;script&gt;fetch('https://c2.evil.test')&lt;/script&gt;</code>`)
    ).toBe(`<script>fetch('https://c2.evil.test')</script>`);
  });

  it('still decodes an entity-encoded document', () => {
    expect(stripHtml('&lt;p&gt;evil.test&lt;/p&gt;')).toBe('evil.test');
  });

  it('still removes a script from an entity-encoded document', () => {
    expect(stripHtml('&lt;script&gt;fetch("http://c2.evil.test")&lt;/script&gt;ok')).toBe('ok');
  });

  it('leaves prose mentioning an unclosed tag alone', () => {
    expect(stripHtml('use &lt;script&gt; carefully')).toBe('use <script> carefully');
  });
});

/**
 * The structured walker has to default unknown elements to a boundary for the same reason
 * the plain-text walker does. Treating them as inline merged separate indicators, and
 * vendor web components make that common.
 */
describe('structured output boundaries for unknown elements', () => {
  it('separates adjacent custom elements', () => {
    expect(
      htmlToStructured('<h2>IOCs</h2><ioc-value>evil.com</ioc-value><ioc-value>bad.net</ioc-value>')
    ).toBe('## IOCs\nevil.com\nbad.net');
  });

  it('still joins inline markup inside a paragraph', () => {
    expect(htmlToStructured('<h2>IOCs</h2><p>c2.<strong>evil</strong>.test</p>')).toBe(
      '## IOCs\nc2.evil.test'
    );
  });
});

/**
 * The self-closing normalizer runs on every page before the parser, so its own cost has
 * to stay linear. The regex form restarted at every `<script` and spent its full
 * attribute allowance before failing: about 293 character checks per input byte, or
 * roughly 4.5 seconds at the 10MB cap. `'<script>'` openers exit that regex immediately
 * at the `>` and never exercised the path, which is why the earlier adversarial test
 * missed it.
 */
describe('self-closing normalization stays linear', () => {
  it('handles many unterminated openers cheaply', () => {
    const input = '<script'.repeat(512000);
    const started = process.hrtime.bigint();
    stripHtml(input);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(400);
  });

  it('does not end a tag at a > inside a quoted attribute', () => {
    expect(stripHtml('<script src="a>b.js"/>kept')).toBe('kept');
  });

  it('does not treat a longer element name as a raw-text tag', () => {
    expect(stripHtml('<scriptfoo>not a script</scriptfoo>')).toBe('not a script');
  });

  it('still normalizes a self-closed script and style', () => {
    expect(stripHtml('<article><script src="x.js"/><p>IOC: evil.test</p></article>')).toBe(
      'IOC: evil.test'
    );
    expect(stripHtml('<article><style/><p>IOC: evil.test</p></article>')).toBe('IOC: evil.test');
  });
});

/**
 * A `<script/>`-looking token inside a raw-text body is not a tag.
 *
 * Normalizing it inserted a closing tag inside the outer element, which ended that
 * element early and spilled the remainder of the script or stylesheet into `body_text`.
 * That is a false-IOC injection primitive, not cosmetic noise: the escaping suffix
 * carries whatever URL the attacker put after it, and extraction then publishes it as a
 * real indicator.
 */
describe('self-closing normalization respects raw-text bodies', () => {
  it('does not let a script body escape via a self-closing string literal', () => {
    const result = stripHtml(
      '<script>const x="<script/>"; fetch("https://false-ioc.test")</script><p>safe</p>'
    );

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  it('does not let a style body escape the same way', () => {
    const result = stripHtml(
      '<style>a{content:"<style/>"} .x{background:url(https://false-ioc.test/a.png)}</style><p>safe</p>'
    );

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  it('discards an unterminated script body rather than emitting it', () => {
    expect(stripHtml('<script>fetch("https://false-ioc.test")')).toBe('');
  });

  // Skipping raw-text bodies must not stop the normalizer finding later candidates.
  it('still normalizes a self-closed script that follows a real one', () => {
    expect(stripHtml('<script>var a=1;</script><script src="y.js"/><p>keep.test</p>')).toBe(
      'keep.test'
    );
  });
});

/**
 * Custom and namespaced element names are exactly what vendor feeds encode, so the
 * residual-tag probe has to recognize them or their tags leak into plain text and the
 * structured renderer never reaches its custom-element boundaries.
 */
describe('entity-encoded custom elements', () => {
  it('re-parses an encoded custom element', () => {
    expect(stripHtml('&lt;ioc-value&gt;evil.com&lt;/ioc-value&gt;')).toBe('evil.com');
  });

  it('re-parses an encoded namespaced element', () => {
    expect(stripHtml('&lt;ns:tag&gt;evil.com&lt;/ns:tag&gt;')).toBe('evil.com');
  });

  it('applies custom-element boundaries after re-parsing', () => {
    expect(
      htmlToStructured(
        '&lt;ioc-value&gt;evil.com&lt;/ioc-value&gt;&lt;ioc-value&gt;bad.net&lt;/ioc-value&gt;'
      )
    ).toBe('evil.com\nbad.net');
  });

  // The wider name pattern must not defeat the guard that protects displayed markup.
  it('still leaves an encoded custom element displayed inside real markup', () => {
    expect(stripHtml('<code>&lt;ioc-value&gt;x&lt;/ioc-value&gt;</code>')).toBe(
      '<ioc-value>x</ioc-value>'
    );
  });
});

/**
 * Truncation counts UTF-16 code units, so a cap landing inside a surrogate pair used to
 * keep the high half alone. An unpaired surrogate renders as a replacement character and
 * is not valid UTF-8 for anything reading the field downstream.
 */
describe('truncate never splits a surrogate pair', () => {
  const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  it.each([
    ['cap inside a pair', 'a\u{1F600}b', 3],
    ['cap after a pair', 'a\u{1F600}b', 4],
    ['leading pair', '\u{1F600}\u{1F600}', 3],
    ['several pairs', '\u{1F600}\u{1F600}\u{1F600}', 5],
    ['pair at the very cap', 'a\u{1F600}', 2],
  ])('emits no lone surrogate: %s', (_label, input, cap) => {
    const result = truncate(input, cap);

    expect(LONE_SURROGATE.test(result)).toBe(false);
    expect(result.length).toBeLessThanOrEqual(cap);
  });

  it('drops the orphaned half rather than the whole character before it', () => {
    expect(truncate('a\u{1F600}b', 3)).toBe('a…');
  });
});

/**
 * A raw-text close tag has to end at a tag boundary.
 *
 * Matching any `</script` prefix meant `</scriptfoo>` looked like the close, so the scan
 * resumed inside a body the parser still considers open and a later `<script/>` there was
 * rewritten, letting the suffix escape as a false IOC again. Trailing junk after the name
 * is legal and does close the element, so the test is the character after the name.
 */
describe('raw-text close tags must end at a tag boundary', () => {
  it('does not accept a longer element name as the close tag', () => {
    const result = stripHtml(
      '<script>const x="</scriptfoo><script/>"; fetch("https://false-ioc.test")</script><p>safe</p>'
    );

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  it('does not accept a longer style name either', () => {
    const result = stripHtml(
      '<style>a{c:"</stylefoo><style/>"} .x{background:url(https://false-ioc.test/a.png)}</style><p>safe</p>'
    );

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  // Per spec a close tag may carry trailing junk and still close the element, so the
  // stricter check must not reject these.
  it.each([
    ['trailing attribute junk', '<script>a=1</script foo><p>safe</p>'],
    ['tab before the bracket', '<script>a=1</script\t><p>safe</p>'],
    ['slash before the bracket', '<script>a=1</script/><p>safe</p>'],
  ])('still treats %s as a close tag', (_label, html) => {
    expect(stripHtml(html)).toBe('safe');
  });

  // The rejection path searches forward, so it must not become quadratic.
  it('stays linear over many non-closing prefix matches', () => {
    const input = `<script>${'</scriptfoo>'.repeat(320000)}`;
    const started = process.hrtime.bigint();
    stripHtml(input);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(1500);
  });
});

/**
 * htmlparser2 ends an end tag at the first `>` and rejects a trailing slash, where the
 * spec and parse5 both read the junk and close the element. Both divergences lost or
 * leaked content, so the normalizer rewrites a junk-carrying raw-text end tag to its
 * plain form before parsing. Semantically free, since the junk is ignored either way.
 */
describe('raw-text end tags carrying junk', () => {
  // `</script foo="a>URL">` closed at the `>` inside the attribute value, spilling the
  // rest of the end tag into body_text with an attacker-chosen URL in it.
  it.each([
    ['double-quoted attribute', '<script>a=1</script foo="a>https://false-ioc.test/x"><p>safe</p>'],
    ['single-quoted attribute', "<script>a=1</script foo='a>https://false-ioc.test/y'><p>safe</p>"],
    ['style element', '<style>a{b:1}</style foo="a>https://false-ioc.test/s"><p>safe</p>'],
  ])('does not end the tag at a > inside a quoted attribute: %s', (_label, html) => {
    const result = stripHtml(html);

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  // `</script/>` kept the element open and swallowed the remainder of the document.
  it.each([
    ['trailing slash', '<script>a=1</script/><p>safe</p>'],
    ['space then slash', '<script>a=1</script /><p>safe</p>'],
    ['style trailing slash', '<style>a{b:1}</style/><p>safe</p>'],
  ])('still closes the element: %s', (_label, html) => {
    expect(stripHtml(html)).toBe('safe');
  });

  it('leaves an ordinary close tag untouched', () => {
    expect(stripHtml('<p>a</p><script>x</script><p>b</p><script>y</script><p>c</p>')).toBe('a b c');
  });

  it('stays linear over many junk-carrying end tags', () => {
    const input = '<script>a</script foo="x">'.repeat(150000);
    const started = process.hrtime.bigint();
    stripHtml(input);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(1500);
  });
});

/**
 * An end tag may legally carry junk, and the raw-parser path normalizes that form, so the
 * probe that decides whether to re-parse an entity-encoded document has to accept it too or
 * the script body stays in body_text.
 */
describe('encoded documents whose end tag carries junk', () => {
  it('re-parses a bare document with a junk-carrying close tag', () => {
    const result = stripHtml(
      '&lt;script&gt;fetch("https://false-ioc.test")&lt;/script foo&gt;safe'
    );

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });
});

/**
 * `String.prototype.toLowerCase` is not length-preserving: `İ` becomes two code units. The
 * scanner took offsets from a lowercased copy and applied them to the original, so one such
 * character anywhere in the page shifted every later offset, the enclosing-element check
 * read the wrong character, and a fake `<script/>` inside a real script body was rewritten,
 * letting the suffix escape as a false IOC.
 */
describe('non-ASCII characters do not shift scanner offsets', () => {
  it('keeps a script body contained when the page contains a dotted capital I', () => {
    const result = stripHtml(
      'İ<script>const x="<script/>"; fetch("https://false-ioc.test")</script><p>safe</p>'
    );

    expect(result).not.toContain('false-ioc.test');
    expect(result).toContain('safe');
  });

  it.each([['İ'], ['ẛ'], ['ΐ']])('still normalizes a self-closed script after %s', (prefix) => {
    expect(
      stripHtml(`${prefix}<article><script src="x.js"/><p>IOC: evil.test</p></article>`)
    ).toContain('IOC: evil.test');
  });

  it('still handles uppercase raw-text tags', () => {
    expect(stripHtml('<SCRIPT>bad()</SCRIPT>ok')).toBe('ok');
    expect(stripHtml('<SCRIPT SRC="x.js"/><P>IOC: evil.test</P>')).toBe('IOC: evil.test');
  });
});

/**
 * The parse cap counts UTF-16 code units, so it could split a surrogate pair one layer
 * earlier than `truncate` and put an unpaired surrogate into body_text.
 */
describe('the parse cap does not split a surrogate pair', () => {
  const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  it('emits no lone surrogate when the cap lands mid-pair', () => {
    const result = stripHtml(`${'a'.repeat(MAX_PARSE_BYTES - 1)}\u{1F600}x`);

    expect(LONE_SURROGATE.test(result)).toBe(false);
  });
});

/**
 * CDATA payloads are expanded into the current walk, not by re-entering the parser.
 *
 * Recursing undid the iterative guarantee the rest of this file maintains. Malformed
 * nesting was quadratic and then fatal: 10ms at 200 openers, 740ms at 2,000, `RangeError`
 * at 20,000. It also walked the payload with href-lifting forced off and, in the structured
 * renderer, with section state reset to prose, so an anchor inside CDATA under an IOC
 * heading lost the href that was the indicator.
 */
describe('CDATA expansion is bounded and inherits walk state', () => {
  it.each([
    ['200 openers', 200],
    ['20000 openers', 20000],
    ['100000 openers', 100000],
  ])('does not overflow or go quadratic on %s', (_label, count) => {
    const input = `${'<![CDATA['.repeat(count)}x]]>`;

    const started = process.hrtime.bigint();
    expect(() => stripHtml(input)).not.toThrow();
    expect(() => htmlToStructured(input)).not.toThrow();
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(3000);
  });

  // Past the bound the payload is dropped, not emitted. Emitting unparsed markup put a
  // script body and its URL into body_text as an extractable indicator.
  it.each([[1], [2], [4], [5], [6], [100]])(
    'never emits unparsed markup at %s levels of nesting',
    (depth) => {
      const input = `${'<![CDATA['.repeat(
        depth
      )}<script>fetch("https://false-ioc.test")</script>safe]]>`;

      expect(stripHtml(input)).not.toContain('false-ioc.test');
      expect(htmlToStructured(input)).not.toContain('false-ioc.test');
    }
  );

  it('keeps the payload at legitimate nesting depth', () => {
    expect(stripHtml('<![CDATA[<script>fetch("https://false-ioc.test")</script>safe]]>')).toBe(
      'safe'
    );
  });

  it('inherits the IOC section so an anchor inside CDATA keeps its href', () => {
    expect(
      htmlToStructured('<h2>IOCs</h2><![CDATA[<a href="https://c2.evil.test/x">indicator</a>]]>')
    ).toBe('## IOCs\nindicator https://c2.evil.test/x');
  });

  it('inherits a references section too', () => {
    expect(
      htmlToStructured('<h2>References</h2><![CDATA[<a href="https://r.test/y">cite</a>]]>')
    ).toBe('## References\ncite https://r.test/y');
  });

  // Prose sections deliberately do not lift, and inheriting state must not change that.
  it('does not lift hrefs for CDATA under a prose heading', () => {
    expect(
      htmlToStructured('<h2>Analysis</h2><![CDATA[<a href="https://x.test/y">link</a>]]>')
    ).toBe('## Analysis\nlink');
  });

  // CDATA content is literal, so a feed that encoded its body and also wrapped it in CDATA
  // arrives still encoded after one parse.
  it.each([
    [
      'a script',
      '<![CDATA[&lt;script&gt;fetch("https://false-ioc.test")&lt;/script&gt;safe]]>',
      'safe',
    ],
    ['a paragraph', '<![CDATA[&lt;p&gt;evil.com&lt;/p&gt;]]>', 'evil.com'],
  ])('re-parses %s that was entity-encoded inside CDATA', (_label, html, expected) => {
    const result = stripHtml(html);

    expect(result).toBe(expected);
    expect(result).not.toContain('false-ioc.test');
  });
});

/**
 * A raw-text opener is only an opener where the document is actually in markup context.
 *
 * Identifying one from the bytes after `<` alone meant `<!-- <script> -->` registered as a
 * real opener. It has no matching close, so the scan ran to end of input and never
 * normalized the genuine `<script/>` after it; the parser then read the following paragraph
 * as script content and the whole report extracted to nothing. The scanner now skips
 * comments, CDATA sections and directives as whole regions, and skips ordinary tags whole
 * so a `<script/>` inside one of their attribute values is not mistaken for a tag.
 */
describe('raw-text openers in non-markup context', () => {
  it.each([
    ['inside a comment', '<!-- <script> --><script/><p>IOC: evil.test</p>'],
    ['style inside a comment', '<!-- <style> --><style/><p>IOC: evil.test</p>'],
    ['inside a CDATA section', '<![CDATA[<script>]]><script/><p>IOC: evil.test</p>'],
    ['inside an attribute value', '<p title="<script/>">IOC: evil.test</p>'],
    ['no preceding context', '<script/><p>IOC: evil.test</p>'],
  ])('still finds the real indicator with an opener %s', (_label, html) => {
    expect(stripHtml(html)).toContain('IOC: evil.test');
  });

  it('still removes a genuine terminated script', () => {
    const result = stripHtml('<script>tracker=1</script><p>IOC: evil.test</p>');

    expect(result).toBe('IOC: evil.test');
    expect(result).not.toContain('tracker');
  });

  // Skipping regions must not reopen the escape the raw-text skip exists to prevent.
  it.each([
    [
      'a string literal',
      '<script>const x="<script/>"; fetch("https://false-ioc.test")</script><p>safe</p>',
    ],
    [
      'a bogus close then a literal',
      '<script>const x="</scriptfoo><script/>"; fetch("https://false-ioc.test")</script><p>safe</p>',
    ],
  ])('keeps a script body contained through %s', (_label, html) => {
    const result = stripHtml(html);

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  // An unterminated tag means no `>` exists from that point on, so no later tag can be
  // complete and the scan stops. Retrying from the next character rescanned the whole
  // remaining input per position, which hung the suite outright at 512,000 openers.
  it('stays linear when a tag never terminates', () => {
    const started = process.hrtime.bigint();
    stripHtml(`<p title="${'a'.repeat(1000000)}`);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(400);
  });
});

/**
 * Without any enclosing element there is no context, so a residual closing tag is the only
 * signal a decoded payload was entity-encoded markup. Void elements never close, so a body
 * of only void elements, or one truncated before its close tag, has no such signal and stays
 * literal — same as prose that merely mentions a tag.
 */
describe('bodies without a closing tag stay literal without one', () => {
  it('re-parses a CDATA payload of only void elements', () => {
    expect(stripHtml('<![CDATA[evil.com&lt;br/&gt;bad.net]]>')).toBe('evil.com bad.net');
  });

  it.each([
    ['a bare void element', 'evil.com&lt;br/&gt;bad.net', 'evil.com<br/>bad.net'],
    ['prose mentioning a tag', 'use &lt;br/&gt; carefully', 'use <br/> carefully'],
    ['a snippet displayed in code', '<code>&lt;br/&gt;</code>', '<br/>'],
  ])('leaves %s alone', (_label, html, expected) => {
    expect(stripHtml(html)).toBe(expected);
  });

  // The walker reaches this path through `inlineTextOf`, which walks CDATA by calling back
  // into it, so decoding before the markup check made the pair unboundedly recursive.
  it('does not recurse on nested CDATA', () => {
    const started = process.hrtime.bigint();
    expect(() => stripHtml(`${'<![CDATA['.repeat(1000)}x]]>`)).not.toThrow();
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(2000);
  });
});

/**
 * `<template>` is inert. The parser puts its children in a document fragment that no reader
 * ever sees, so component templates carrying example or stale URLs were feeding body_text
 * values a human never read, which extraction then promoted as indicators.
 */
describe('non-rendered subtrees', () => {
  it.each([
    ['a template at top level', '<template><p>c2.stale.test</p></template><p>safe</p>', 'safe'],
    [
      'a template nested in content',
      '<div><template><a href="http://c2.stale.test/x">l</a></template>keep</div>',
      'keep',
    ],
    [
      'a template under an IOC heading',
      '<h2>IOCs</h2><template><a href="http://c2.stale.test/x">l</a></template><p>real.test</p>',
      'IOCs real.test',
    ],
  ])('drops %s', (_label, html, expected) => {
    const result = stripHtml(html);

    expect(result).toBe(expected);
    expect(result).not.toContain('c2.stale.test');
  });

  it('drops a template subtree from structured output too', () => {
    expect(
      htmlToStructured(
        '<h2>IOCs</h2><template><a href="http://c2.stale.test/x">l</a></template><p>real.test</p>'
      )
    ).toBe('## IOCs\nreal.test');
  });

  // The element still separates the text on either side, same as script and style.
  it('still emits a boundary where the template was', () => {
    expect(stripHtml('evil.com<template>x</template>bad.net')).toBe('evil.com bad.net');
  });

  // `noscript` content is fallback that a reader with scripting disabled does see, so it is
  // deliberately not skipped.
  it('keeps noscript content', () => {
    expect(stripHtml('<noscript><p>fallback.test</p></noscript>after')).toBe('fallback.test after');
  });
});

/**
 * A close tag that never terminates leaves the element open to end of input, so the remainder
 * is raw text. Resuming the scan inside that body let a `<script/>`-looking string in it be
 * rewritten, which introduced the `>` needed to end the outer element and spilled the rest of
 * the code into body_text as a false indicator.
 */
describe('unterminated raw-text close tags stay opaque', () => {
  it.each([
    ['a script body', '<script>a=1</script foo="<script/>'],
    ['a style body', '<style>a{b:1}</style foo="<style/>'],
  ])('does not resume scanning inside %s', (_label, html) => {
    expect(stripHtml(html)).toBe('');
  });

  it('still handles a terminated junk-carrying close tag', () => {
    expect(stripHtml('<script>a=1</script foo="x"><p>safe</p>')).toBe('safe');
  });
});

/**
 * `summary` is a standard HTML element as well as an Atom construct, and the predicate matched
 * on name alone. An Atom text construct holds character data and nothing else, so an element
 * child means this is the HTML element, and the literal branch emits raw text without applying
 * subtree filtering: `<details><summary><script>…</script>Visible</summary></details>` put the
 * script body and its URL into body_text.
 */
describe('HTML elements sharing an Atom construct name', () => {
  it('walks an HTML summary normally and skips its script', () => {
    const html =
      '<details><summary><script>fetch("https://false-ioc.test")</script>Visible</summary></details>';
    const result = stripHtml(html);

    expect(result).toBe('Visible');
    expect(result).not.toContain('false-ioc.test');
  });

  it('does the same in structured output', () => {
    expect(
      htmlToStructured(
        '<details><summary><script>fetch("https://false-ioc.test")</script>Visible</summary></details>'
      )
    ).toBe('Visible');
  });

  it('skips a template inside an HTML summary too', () => {
    expect(
      stripHtml(
        '<details><summary><template><p>c2.stale.test</p></template>Visible</summary></details>'
      )
    ).toBe('Visible');
  });
});

describe('multiple hrefs lift within the same section', () => {
  it('lifts every href under one heading', () => {
    expect(
      htmlToStructured(
        '<h2>IOCs</h2><p><a href="https://c2.evil.test/x">ioc</a></p>' +
          '<p><a href="https://b.test/y">two</a></p>'
      )
    ).toBe('## IOCs\nioc https://c2.evil.test/x\ntwo https://b.test/y');
  });
});

/**
 * An element carrying the HTML `hidden` attribute is not rendered, so its text is not report
 * content. It was being stored and promoted as an indicator, and because article scoring calls
 * `stripHtml`, a candidate holding a large hidden subtree could outscore the real report.
 */
describe('hidden subtrees', () => {
  it.each([
    ['a bare hidden attribute', '<div hidden>c2.stale.test</div><p>safe</p>'],
    ['hidden with a value', '<div hidden="hidden">c2.stale.test</div><p>safe</p>'],
  ])('drops %s', (_label, html) => {
    const result = stripHtml(html);

    expect(result).toBe('safe');
    expect(result).not.toContain('c2.stale.test');
  });

  it('drops a hidden subtree from structured output too', () => {
    expect(htmlToStructured('<div hidden>c2.stale.test</div><p>safe</p>')).toBe('safe');
  });

  it('keeps a visible sibling of the same shape', () => {
    expect(stripHtml('<div>keep.test</div><p>safe</p>')).toBe('keep.test safe');
  });
});

/**
 * In HTML an unquoted attribute value may contain `/`, so a trailing slash there belongs to the
 * value and is not a self-closing flag. Reading `<script src=x/>` as self-closing rewrote it to
 * an empty script pair, which exposed the real script body as report text with its URL in it.
 */
describe('self-closing detection and unquoted attribute values', () => {
  it.each([
    [
      'a script with an unquoted value',
      '<script src=x/>fetch("https://false-ioc.test")</script><p>safe</p>',
    ],
    [
      'a style with an unquoted value',
      '<style src=x/>a{b:url(https://false-ioc.test)}</style><p>safe</p>',
    ],
  ])('does not treat the value slash in %s as self-closing', (_label, html) => {
    const result = stripHtml(html);

    expect(result).toBe('safe');
    expect(result).not.toContain('false-ioc.test');
  });

  it.each([
    ['a quoted value', '<article><script src="x.js"/><p>IOC: evil.test</p></article>'],
    ['no attributes', '<script/><p>IOC: evil.test</p>'],
    ['whitespace before the slash', '<script src=x /><p>IOC: evil.test</p>'],
  ])('still normalizes a genuine self-closed script with %s', (_label, html) => {
    expect(stripHtml(html)).toBe('IOC: evil.test');
  });

  it('still handles a quoted > in the open tag', () => {
    expect(stripHtml('<script src="a>b.js"/>kept')).toBe('kept');
  });
});

/**
 * Browsers do not render `<iframe>` contents, so embedded fallback or tracking text is not report
 * text. It was reaching body_text and, because article scoring shares this rule, an iframe-heavy
 * teaser could also outweigh the visible report.
 */
describe('iframe contents are not report text', () => {
  it('drops an iframe body from plain text', () => {
    const result = stripHtml('<iframe>https://stale.example</iframe><p>safe</p>');

    expect(result).toBe('safe');
    expect(result).not.toContain('stale.example');
  });

  it('drops an iframe body from structured output', () => {
    expect(htmlToStructured('<iframe>https://stale.example</iframe><p>safe</p>')).toBe('safe');
  });

  // `noscript` is still kept, since a reader with scripting disabled does see it.
  it('keeps noscript content', () => {
    expect(stripHtml('<noscript><p>fallback.test</p></noscript>after')).toBe('fallback.test after');
  });
});
