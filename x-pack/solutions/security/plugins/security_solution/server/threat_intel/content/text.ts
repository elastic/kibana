/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyHeader, type SectionKind } from './section_headers';

/**
 * Strip HTML tags and decode the small set of named entities that show up
 * routinely in RSS / vendor JSON descriptions.
 *
 * RSS feeds embed HTML in `<description>` and `<content:encoded>`. A
 * full HTML parse is overkill — we only need plain text for
 * `content.body_text`, which feeds inference (`semantic_text`) and the
 * BM25 sibling field. The downstream `enrich_threat_report`
 * workflow re-runs IOC regex extraction on `body_text` and does not
 * benefit from intact markup.
 *
 * The original HTML is preserved as `content.body_html` (mapped
 * `index: false`) so consumers can render formatted HTML when needed.
 */
/**
 * Largest input the parsers will touch.
 *
 * These entry points take fetched web pages, so the input is attacker-influenced
 * and unbounded. An ad-heavy page is realistically several megabytes, and this runs
 * inside a task worker: cheerio builds a full DOM and the regex passes each walk the
 * whole string. Truncating rather than throwing keeps a fat page degraded instead of
 * failed, since the article body is nearly always near the top.
 *
 * 10MB matches the `body_html` bound the report API already enforces.
 */
export const MAX_PARSE_BYTES = 10 * 1024 * 1024;

const capInput = (html: string): string =>
  html.length > MAX_PARSE_BYTES ? html.slice(0, MAX_PARSE_BYTES) : html;

/**
 * Removes `<script>` and `<style>` elements, including ones with no closing tag.
 *
 * The terminated patterns run first so a following sibling is not swallowed. The
 * unterminated pass then discards from an opening tag to end of input, which matters
 * for two reasons. Malformed feed HTML is one, but the bigger one is `capInput`: a
 * perfectly valid document truncated at MAX_PARSE_BYTES can lose the closing tag,
 * and the generic tag stripper then removes only `<script>` and leaves the entire
 * body as report text. That text goes to the LLM stages and IOC extraction, so it is
 * both a cost and a precision problem, not just noise.
 *
 * The end tag matches attributes and arbitrary whitespace (`</script foo>`,
 * `</script\t\n>`) so a crafted close tag cannot smuggle a body past this.
 */
/**
 * Matches an HTML tag, requiring a tag-like character after `<`.
 *
 * A bare `<[^>]+>` treats any `<...>` span as a tag, so prose comparisons were eaten:
 * `5 < 10 and 3 > 1` collapsed to `5 1`, and threat reports contain plenty of
 * `payload < 4KB` and `CVSS > 7`. Requiring a letter, `/`, `!`, or `?` covers real
 * tags, closing tags, comments, and processing instructions while leaving prose alone.
 *
 * Shared safely because it is only ever used with `String.replace`, which resets
 * `lastIndex` around each call. Do not reach for `.test()` or `.exec()` on it without
 * cloning first, since those do carry state between calls.
 */
const TAG_PATTERN = /<[a-z!?/][^>]*>/gi;

const stripScriptAndStyle = (html: string): string =>
  html
    // `(?=[\s/>])` and not `\b`: `\b` also matches before a hyphen, so a valid custom
    // element like `<script-loader>` was read as an unterminated `<script>` and the
    // end-of-input pass then discarded the entire rest of the document, body and IOCs
    // included. Requiring whitespace, `/`, or `>` pins the exact element name.
    .replace(/<script(?=[\s/>])[\s\S]*?<\/script(?=[\s/>])[^>]*>/gi, ' ')
    .replace(/<style(?=[\s/>])[\s\S]*?<\/style(?=[\s/>])[^>]*>/gi, ' ')
    .replace(/<script(?=[\s/>])[\s\S]*$/i, ' ')
    .replace(/<style(?=[\s/>])[\s\S]*$/i, ' ')
    // Removing an unterminated element can orphan a partial tag that the generic tag
    // pass would otherwise have absorbed: in `<scr<script>ipt>payload` the outer
    // `<scr` was only swallowed because the script's `>` terminated it. Requiring a
    // letter or slash after `<` keeps ordinary prose like `5 < 10` intact.
    .replace(/<\/?[a-z][^>]*$/i, ' ');

export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  const capped = capInput(html);
  // Drop the most expensive substrings up front (script/style bodies)
  // before falling through to the generic tag stripper.
  const withoutScripts = stripScriptAndStyle(capped);
  const withoutTags = withoutScripts.replace(TAG_PATTERN, ' ');
  const decoded = decodeEntities(withoutTags);
  return collapseWhitespace(decoded);
};

/**
 * A `Map`, not an object literal. A bare object inherits from `Object.prototype`, so
 * `NAMED_ENTITIES['constructor']` resolves to a function and the `!== undefined`
 * guard below treats it as a valid replacement. Feed HTML containing `&constructor;`
 * or `&toString;` then injected `function Object() { [native code] }` into the report
 * body, which flows on to the LLM stages and IOC extraction.
 */
const NAMED_ENTITIES = new Map<string, string>(
  Object.entries({
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    copy: '\u00a9',
    reg: '\u00ae',
    hellip: '\u2026',
    mdash: '\u2014',
    ndash: '\u2013',
    lsquo: '\u2018',
    rsquo: '\u2019',
    ldquo: '\u201c',
    rdquo: '\u201d',
  })
);

/**
 * `String.fromCodePoint` throws on anything above the Unicode maximum, and feed
 * HTML is untrusted, so `&#9999999;` would take down the whole extraction.
 */
const codePointToString = (code: number, fallback: string): string =>
  Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : fallback;

const decodeEntities = (input: string): string =>
  input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return codePointToString(parseInt(entity.slice(2), 16), match);
    }
    if (entity.startsWith('#')) {
      return codePointToString(parseInt(entity.slice(1), 10), match);
    }
    const replacement = NAMED_ENTITIES.get(entity);
    return replacement !== undefined ? replacement : match;
  });

/**
 * Collapse runs of whitespace (including unicode line separators) and
 * trim. A naive `\s+` would leave the leading/trailing whitespace that
 * `<description><![CDATA[ ... ]]></description>` introduces.
 */
export const collapseWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

/**
 * Truncate to a max length, keeping a sensible word boundary if one
 * lands close to the cap. Titles are semantic_text so shorter strings save inference tokens.
 */
export const truncate = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) return input;
  if (maxLength <= 0) return '';
  // Reserve the ellipsis inside the cap. Slicing to `maxLength` and then appending
  // put every truncated value one character over, so a field truncated to the stored
  // title or body cap still failed a downstream length check at exactly that cap.
  const contentLength = maxLength - 1;
  const slice = input.slice(0, contentLength);
  const lastBoundary = slice.lastIndexOf(' ');
  // Only honor the boundary if it's reasonably close to the cap — otherwise
  // a title like "x ".repeat(N) + "very long word" would shrink to two
  // characters.
  if (lastBoundary > contentLength * 0.6) {
    return `${slice.slice(0, lastBoundary).trimEnd()}\u2026`;
  }
  return `${slice.trimEnd()}\u2026`;
};

/**
 * Split HTML at heading tag boundaries, returning chunks annotated with
 * their section kind. Each chunk carries the raw HTML for that segment
 * (including the heading tag itself for non-prose chunks).
 */
const splitHtmlBySections = (html: string): Array<{ kind: SectionKind; html: string }> => {
  const chunks: Array<{ kind: SectionKind; html: string }> = [];
  let currentKind: SectionKind = 'prose';
  // Depth of the heading that established `currentKind`, so a deeper unclassified
  // subsection can inherit it.
  let currentDepth = 0;
  let currentHtml = '';

  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = headingRe.exec(html)) !== null) {
    const beforeHeading = html.slice(lastIndex, m.index);
    if (beforeHeading) {
      currentHtml += beforeHeading;
    }
    // Flush the current chunk before starting the new section.
    if (currentHtml) {
      chunks.push({ kind: currentKind, html: currentHtml });
    }
    const depth = Number(m[1]);
    // Decode entities before classifying: `Indicators&nbsp;of&nbsp;Compromise` is a
    // completely ordinary heading, and classifying the raw form read it as prose, so
    // its anchor hrefs were dropped instead of lifted.
    const headingText = collapseWhitespace(decodeEntities(m[2].replace(TAG_PATTERN, ' ')));
    const classified = classifyHeader(headingText);

    if (classified !== 'prose') {
      // An explicitly classified heading always wins and becomes the new anchor.
      currentKind = classified;
      currentDepth = depth;
    } else if (currentKind !== 'prose' && depth > currentDepth) {
      // A deeper unclassified heading is a subsection of the section we are in, so
      // keep it. `<h2>Indicators of Compromise</h2><h3>Domains</h3>` used to fall
      // back to prose at `Domains` and drop every href under it.
      // currentKind and currentDepth are unchanged.
    } else {
      currentKind = 'prose';
      currentDepth = depth;
    }

    currentHtml = m[0]; // include the heading tag in this chunk
    lastIndex = m.index + m[0].length;
  }

  const remaining = html.slice(lastIndex);
  if (remaining) {
    currentHtml += remaining;
  }
  if (currentHtml) {
    chunks.push({ kind: currentKind, html: currentHtml });
  }

  return chunks;
};

/**
 * Convert HTML to a structured text form that preserves block boundaries,
 * table rows, headers, and lists so that IOC extraction can see table-cell
 * values as recoverable tokens rather than a collapsed space-run.
 *
 * TRANSIENT — the result is used only inside `extract_iocs`; it is never
 * stored, indexed, or emitted to any search field. `body_text` storage and
 * `stripHtml` are UNCHANGED.
 *
 * Transformations:
 *   <script>/<style>          → stripped (mirrors stripHtml pre-pass)
 *   <h1>–<h6>                 → ## heading text
 *   <tr> with <td>/<th> cells → | cell1 | cell2 | pipe-delimited row
 *   <li>                      → - item text
 *   block elements (p, div, br, …) → newline boundary
 *   <a href> in IOC/References sections → "anchortext URL" (href lifted as token)
 *   <a href> in prose         → anchor text only (href dropped, mirrors reader-mode)
 *   inline tags               → removed; content kept
 *   HTML entities             → decoded (reuses decodeEntities)
 *
 * The anchor-href lift is SCOPED to IOC and References heading sections only.
 * Prose <a href> links are collapsed to their anchor text so that clickable
 * inline citations (learn.microsoft.com, GitHub tool links, blog navigation)
 * don't flood extraction with reference-noise URLs. Real inline IOCs appear
 * as defanged literal text in prose and are extracted by the regex path
 * regardless of this anchor-text collapse.
 */
export const htmlToStructured = (html: string | undefined | null): string => {
  if (!html) return '';
  const capped = capInput(html);

  // 1. Drop script/style bodies (same pre-pass as stripHtml). The end tag
  //    matches attributes/junk too (`</script foo>`, `</script\t\n bar>`) so a
  //    crafted close tag cannot smuggle a body past the stripper.
  const cleaned = stripScriptAndStyle(capped);

  // 2. Split at heading boundaries so each chunk knows its section kind.
  //    Href-lifting is applied only to ioc and references chunks (step 3 below).
  const sectionChunks = splitHtmlBySections(cleaned);

  const processedParts: string[] = [];

  for (const { kind, html: chunkHtml } of sectionChunks) {
    let s = chunkHtml;

    // 3. Anchor href lift — only for IOC and References sections.
    //    In prose: collapse <a> to its inner text (href dropped).
    if (kind === 'ioc' || kind === 'references') {
      // Lift hrefs into plain text FIRST, before container transforms, so URLs
      // inside <li>/<td> survive. Produces "anchortext URL" as a bare token.
      // Both quoted and unquoted href forms. Unquoted is valid HTML, and without
      // the second alternative the generic tag stripper removed the attribute and
      // an href-only IOC was lost entirely.
      s = s.replace(
        // `\shref\s*=` requires a real attribute boundary. Without it the greedy
        // prefix could run past `data-href="..."` and lift the tracker instead of the
        // link, which in an IOC section both loses the indicator and invents one.
        /<a\b[^>]*?\shref\s*=\s*(?:["']([^"']+)["']|([^\s"'>]+))[^>]*>([\s\S]*?)<\/a>/gi,
        (_m, quotedHref: string | undefined, bareHref: string | undefined, inner: string) => {
          const href = quotedHref ?? bareHref ?? '';
          const text = inner.replace(TAG_PATTERN, ' ').trim();
          return `${text} ${href} `;
        }
      );
    } else {
      // Prose: collapse anchor to its visible text only.
      s = s.replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, (_m, inner: string) => {
        return `${inner.replace(TAG_PATTERN, ' ').trim()} `;
      });
    }

    // 4. Headings → "## text\n"
    s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner: string) => {
      const text = inner.replace(TAG_PATTERN, ' ').trim();
      return text ? `\n## ${collapseWhitespace(text)}\n` : '';
    });

    // 5. Table rows → "| cell | cell |\n"
    s = s.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_m, inner: string) => {
      const cellTexts: string[] = [];
      const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellPattern.exec(inner)) !== null) {
        const cellContent = cellMatch[1].replace(TAG_PATTERN, ' ').trim();
        cellTexts.push(collapseWhitespace(cellContent));
      }
      return cellTexts.length > 0 ? `\n| ${cellTexts.join(' | ')} |\n` : '\n';
    });

    // 6. List items → "- text\n"
    s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => {
      const text = inner.replace(TAG_PATTERN, ' ').trim();
      return text ? `\n- ${collapseWhitespace(text)}\n` : '';
    });

    // 7. Block-level elements → newline boundary.
    s = s.replace(
      /<\/?(p|div|section|article|aside|header|footer|main|figure|blockquote|pre|ul|ol|table|thead|tbody|tfoot)[^>]*>/gi,
      '\n'
    );
    s = s.replace(/<br\s*\/?>/gi, '\n');

    // 8. Strip remaining tags (inline and any leftovers). Loop until stable so
    //    a crafted string like `<scr<script>ipt>` cannot reassemble a tag after
    //    a single pass.
    let previous: string;
    do {
      previous = s;
      s = s.replace(TAG_PATTERN, '');
    } while (s !== previous);

    processedParts.push(s);
  }

  // 9. Decode HTML entities.
  const result = decodeEntities(processedParts.join(''));

  // 10. Normalise runs within each line; preserve structural newlines.
  const lines = result
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0);

  return lines.join('\n');
};

/** `content` block written by every ingest path (adapters + manual ingest). */
export interface ReportContentDocument {
  title: string;
  body_text: string;
  body_html?: string;
  language: string;
  /**
   * Set when `body_text` is the title rather than a real body.
   *
   * Without it the document is indistinguishable from one that genuinely repeats its
   * title, so enrichment runs inference over the same string twice at full cost and
   * has no way to know the input is a headline. Present only when true, so it does
   * not clutter every report.
   */
  body_is_title_fallback?: true;
}

/**
 * Build the `content` object for a threat report. The `content.title_bm25` /
 * `content.body_text_bm25` siblings are populated by Elasticsearch `copy_to`
 * on index (see `setup/index_templates.ts`) so ingest paths stay aligned with
 * the strict mapping and `normalizedReportSchema`.
 *
 * An empty `body_text` falls back to the title. Every enrichment route requires a
 * non-empty `text`, so a report stored with no body can never be enriched: it stays
 * `pending`, `load_pending_reports` keeps picking it up, and it occupies a slot in
 * the scheduled batch indefinitely. Title-only entries are common in RSS and Atom
 * feeds that carry only a headline and a link, and a headline is thin but real
 * input. This is done here rather than in each adapter so all six get it.
 */
export const buildReportContent = ({
  title,
  bodyText,
  bodyHtml,
  language = 'en',
}: {
  title: string;
  bodyText: string;
  bodyHtml?: string;
  language?: string;
}): ReportContentDocument => {
  const isTitleFallback = bodyText.trim().length === 0;
  return {
    title,
    body_text: isTitleFallback ? title : bodyText,
    ...(bodyHtml !== undefined ? { body_html: bodyHtml } : {}),
    language,
    // Observable rather than silent: a consumer can skip or cheapen enrichment
    // instead of paying to run inference over the title twice.
    ...(isTitleFallback ? { body_is_title_fallback: true as const } : {}),
  };
};
