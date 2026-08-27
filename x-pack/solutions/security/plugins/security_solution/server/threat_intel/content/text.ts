/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import { classifyHeader, type SectionKind } from './section_headers';

/**
 * Largest input the parsers will touch.
 *
 * These entry points take fetched web pages, so the input is attacker-influenced
 * and unbounded. An ad-heavy page is realistically several megabytes, and this runs
 * inside a task worker, where cheerio builds a full DOM. Truncating rather than
 * throwing keeps a fat page degraded instead of failed, since the article body is
 * nearly always near the top.
 *
 * 10MB matches the `body_html` bound the report API already enforces.
 */
export const MAX_PARSE_BYTES = 10 * 1024 * 1024;

const capInput = (html: string): string =>
  html.length > MAX_PARSE_BYTES ? html.slice(0, MAX_PARSE_BYTES) : html;

/**
 * Inline elements, which carry no token boundary.
 *
 * Everything else does. Threat reports routinely split an indicator across inline
 * formatting, and `<p>c2.<strong>evil</strong>.test</p>` has to yield `c2.evil.test`
 * rather than `c2. evil .test`, or extraction misses the domain entirely. The regex
 * implementation could not draw this distinction at all, because it only ever saw a
 * `<tag>` to substitute; the parser knows which element it is looking at.
 *
 * Listed as an allowlist rather than a blocklist so an unknown or custom element still
 * produces a boundary. That is the safe default: a spurious boundary splits one token,
 * whereas a missing one silently merges two adjacent indicators into an unextractable
 * value.
 */
const INLINE_NAMES = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'code',
  'data',
  'dfn',
  'em',
  'font',
  'i',
  'kbd',
  'mark',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'tt',
  'u',
  'var',
  'wbr',
]);

/**
 * Minimal shape of a parsed DOM node.
 *
 * Declared here rather than imported from cheerio. A transitive `@types/cheerio@0.22`
 * shadows the types bundled with the installed cheerio 1.0.0-rc.12, predating both the
 * node types and `contents()` by several majors. Projects that pin an explicit `types`
 * array in their tsconfig resolve the correct types; `security_solution` does not, and
 * narrowing type resolution for a plugin this size to fix one import is the wrong trade.
 */
interface ParsedNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: ParsedNode[];
}

/**
 * Elements whose subtree is markup machinery rather than report text.
 *
 * Skipped during the walk rather than removed up front with `$('script, style').remove()`.
 * That selector pass is quadratic in nesting depth (measured on `'<div>'.repeat(n)`: 23ms
 * at n=12,500 rising to 2.6s at n=100,000) because the selector engine re-checks
 * ancestors per candidate node, which would have reintroduced the same denial of service
 * the parser swap was meant to remove. Skipping the subtree in the walk is O(1) per node.
 *
 * Dropping these as whole subtrees is also what makes truncation safe: a valid document
 * cut at `MAX_PARSE_BYTES` can lose its closing `</script>`, and the parser treats the
 * remainder as raw script text rather than leaking it into report text.
 */
const RAW_TEXT_NAMES = new Set(['script', 'style']);

/**
 * Rewrites an explicitly self-closed `<script/>` or `<style/>` into an empty element
 * pair before parsing.
 *
 * HTML has no self-closing syntax for raw-text elements, so a spec-compliant parser
 * reads `<script src="x.js"/><p>evil.test</p>` as a script whose *body* is that
 * paragraph, and the whole remainder of the document is discarded with it. Browsers
 * agree, but feeds do not: RSS payloads are frequently XHTML, where the form is
 * legitimately self-closing, and honoring the HTML reading there silently drops every
 * indicator after the tag.
 *
 * The attribute run is quote-aware so a `>` inside an attribute value cannot end the
 * match early, and bounded so many unterminated openers cannot make this quadratic.
 * Overshooting the bound only means the tag is left for the parser to read per spec,
 * which is the safe direction.
 */
const SELF_CLOSED_RAW_TEXT = /<(script|style)((?:"[^"]*"|'[^']*'|[^>"']){0,2048}?)\/>/gi;

export const normalizeSelfClosedRawText = (html: string): string =>
  html.replace(SELF_CLOSED_RAW_TEXT, '<$1$2></$1>');

/**
 * Fragment mode (`isDocument: false`), so a `<description>` snippet is not wrapped in
 * `<html>/<head>/<body>`. It also keeps bare table and list fragments intact, which
 * matters because feed HTML routinely ships a `<tr>` with no enclosing `<table>`.
 *
 * htmlparser2 rather than cheerio's default parse5, because parse5 implements the full
 * HTML5 tree construction algorithm and several of its steps ("has an element in button
 * scope") walk the open-element stack, making it quadratic in nesting depth. Measured on
 * `'<div>'.repeat(n)`: parse5 takes 14ms at n=2,000, 257ms at n=10,000 and 8.3s at
 * n=50,000, so a few hundred KB of nested divs inside the 10MB cap pegs a task worker
 * for minutes. htmlparser2 is linear over the same inputs (2ms / 5ms / 18ms). Both parse
 * the malformed feed markup this file exists to handle, including implicit `</li>` and
 * `</td>` and raw-text `<script>` bodies; parse5's extra fidelity is table foster
 * parenting and formatting-element reconstruction, none of which affects text extraction.
 */
const PARSER_OPTIONS = { _useHtmlParser2: true } as const;

const parseTopLevelNodes = (html: string): ParsedNode[] => {
  const $ = cheerio.load(normalizeSelfClosedRawText(html), PARSER_OPTIONS);
  // The one cast in this file, at the boundary where the stale typings stop describing
  // the runtime. `toArray()` is declared, its element type is not.
  const roots = $.root().toArray() as unknown as ParsedNode[];
  return roots.flatMap((root) => root.children ?? []);
};

const isElement = (node: ParsedNode): boolean =>
  node.type === 'tag' || node.type === 'script' || node.type === 'style';

const elementName = (node: ParsedNode): string => node.name?.toLowerCase() ?? '';

const childrenOf = (node: ParsedNode): ParsedNode[] => node.children ?? [];

/**
 * A closing tag in text that came out of a parse means the input carried
 * entity-encoded markup, which the parser correctly decoded to text.
 *
 * RSS and Atom routinely encode a whole HTML body inside `<description>`, so one
 * decode leaves `<p>...</p>` sitting in what is supposed to be plain text. A single
 * bounded re-parse resolves that. Requiring a *closing* tag is what keeps prose safe:
 * a threat report discussing `use &lt;script&gt; carefully` decodes to text with no
 * closing tag and is left alone, while `&lt;script&gt;...&lt;/script&gt;` is re-parsed
 * and removed as an element.
 */
const RESIDUAL_CLOSING_TAG = /<\/[a-z][a-z0-9]*\s*>/i;

/** Stack entry: a node still to visit, or literal output to append after its subtree. */
type WalkStep = { kind: 'node'; node: ParsedNode } | { kind: 'emit'; text: string };

/**
 * Pushed in reverse so the stack pops in document order.
 *
 * The walks in this file are iterative rather than recursive on purpose. Feed HTML is
 * attacker-controlled and the parser imposes no nesting limit, so `'<div>'.repeat(n)`
 * builds an arbitrarily deep tree; a recursive walk would exhaust the call stack and
 * take the task worker down with it.
 */
const pushNodes = (stack: WalkStep[], nodes: ParsedNode[]): void => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push({ kind: 'node', node: nodes[i] });
  }
};

const hrefOf = (node: ParsedNode): string | undefined => {
  const href = node.attribs?.href;
  return typeof href === 'string' && href.length > 0 ? href : undefined;
};

/**
 * Text of a subtree with a space at every element boundary.
 *
 * The boundary is the whole point: `<td>evil.com</td><td>bad.net</td>` has to yield two
 * tokens, not `evil.combad.net`. Concatenating text nodes (what a plain `.text()` does)
 * merges adjacent indicators into one value that IOC extraction can never match.
 *
 * `liftHrefs` reproduces the anchor-href lift for IOC and reference sections, where the
 * link target is itself the indicator.
 */
const inlineTextOf = (nodes: ParsedNode[], liftHrefs: boolean): string => {
  const out: string[] = [];
  const stack: WalkStep[] = [];
  pushNodes(stack, nodes);

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;

    if (step.kind === 'emit') {
      out.push(step.text);
    } else {
      const { node } = step;
      const liftedHref =
        isElement(node) && liftHrefs && elementName(node) === 'a' ? hrefOf(node) : undefined;

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (!isElement(node)) {
        // Comments, directives, and CDATA carry no report text, but they did separate
        // the text on either side, so they still emit a boundary. Dropping the node
        // wholesale is what keeps `<!-- hidden > c2.evil.test -->` from being extracted
        // as a live IOC; emitting the boundary is what keeps `evil.com<!-- x -->bad.net`
        // from merging into one unextractable token.
        out.push(' ');
      } else if (RAW_TEXT_NAMES.has(elementName(node))) {
        out.push(' ');
      } else if (liftedHref !== undefined) {
        out.push(` ${collapseWhitespace(inlineTextOf(childrenOf(node), false))} ${liftedHref} `);
      } else if (INLINE_NAMES.has(elementName(node))) {
        pushNodes(stack, childrenOf(node));
      } else {
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        pushNodes(stack, childrenOf(node));
      }
    }
  }

  return out.join('');
};

const extractPlainText = (html: string): string => inlineTextOf(parseTopLevelNodes(html), false);

/**
 * Strip HTML tags and decode entities, yielding the plain text stored as
 * `content.body_text`.
 *
 * RSS feeds embed HTML in `<description>` and `<content:encoded>`. `body_text` feeds
 * inference (`semantic_text`) and the BM25 sibling field, and the downstream
 * `enrich_threat_report` workflow re-runs IOC regex extraction over it, so it needs to
 * be text with intact token boundaries rather than intact markup.
 *
 * The original HTML is preserved as `content.body_html` (mapped `index: false`) for
 * archival, so extraction can be re-run without re-fetching. It is unsanitized
 * attacker-controlled feed markup and must not be rendered: `extractArticleHtml`
 * removes a little chrome but preserves everything dangerous, so a consumer that
 * injects it has stored XSS. Render `body_text`.
 */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  const first = extractPlainText(capInput(html));
  const text = RESIDUAL_CLOSING_TAG.test(first) ? extractPlainText(first) : first;
  return collapseWhitespace(text);
};

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
    return `${slice.slice(0, lastBoundary).trimEnd()}…`;
  }
  return `${slice.trimEnd()}…`;
};

const HEADING_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Elements that imply a line boundary in the structured form. */
const BLOCK_NAMES = new Set([
  'p',
  'div',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'main',
  'figure',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'tfoot',
]);

const renderStructured = (html: string): string => {
  // Section state, advanced in document order as headings are met. A heading that
  // classifies as ioc or references becomes the anchor for everything below it, and a
  // deeper unclassified heading is treated as its subsection: without that,
  // `<h2>Indicators of Compromise</h2><h3>Domains</h3>` fell back to prose at `Domains`
  // and dropped every href under it.
  let sectionKind: SectionKind = 'prose';
  let sectionDepth = 0;

  const out: string[] = [];
  const stack: WalkStep[] = [];
  pushNodes(stack, parseTopLevelNodes(html));

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;

    if (step.kind === 'emit') {
      out.push(step.text);
    } else {
      const { node } = step;
      const name = elementName(node);
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = sectionKind === 'ioc' || sectionKind === 'references';

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (!isElement(node)) {
        // Comments, doctype, and CDATA contribute a boundary only.
        out.push(' ');
      } else if (RAW_TEXT_NAMES.has(name)) {
        out.push(' ');
      } else if (HEADING_NAMES.has(name)) {
        const depth = Number(name.slice(1));
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), false));
        const classified = classifyHeader(text);
        if (classified !== 'prose') {
          // An explicitly classified heading becomes the new anchor.
          sectionKind = classified;
          sectionDepth = depth;
        } else if (sectionKind === 'prose' || depth <= sectionDepth) {
          sectionKind = 'prose';
          sectionDepth = depth;
        }
        // The remaining case is a deeper unclassified heading inside a classified
        // section, which is a subsection: the anchor stays put.
        if (text) out.push(`\n## ${text}\n`);
      } else if (name === 'tr') {
        const cellTexts = childrenOf(node)
          .filter((child) => ['td', 'th'].includes(elementName(child)))
          .map((cell) => collapseWhitespace(inlineTextOf(childrenOf(cell), lift)));
        out.push(cellTexts.length > 0 ? `\n| ${cellTexts.join(' | ')} |\n` : '\n');
      } else if (name === 'li') {
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), lift));
        if (text) out.push(`\n- ${text}\n`);
      } else if (name === 'a') {
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), false));
        const href = lift ? hrefOf(node) : undefined;
        // Prose anchors collapse to their visible text. Clickable inline citations
        // (vendor docs, GitHub tool links, blog navigation) would otherwise flood
        // extraction with reference noise, and a real inline IOC appears as defanged
        // literal text that the regex path picks up regardless.
        out.push(href !== undefined ? `${text} ${href} ` : `${text} `);
      } else if (name === 'br') {
        out.push('\n');
      } else if (BLOCK_NAMES.has(name)) {
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node));
      } else {
        // Inline element: no boundary, contents kept.
        pushNodes(stack, childrenOf(node));
      }
    }
  }

  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
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
 *   <script>/<style>          → removed as whole elements
 *   <h1>–<h6>                 → ## heading text
 *   <tr> with <td>/<th> cells → | cell1 | cell2 | pipe-delimited row
 *   <li>                      → - item text
 *   block elements (p, div, br, …) → newline boundary
 *   <a href> in IOC/References sections → "anchortext URL" (href lifted as token)
 *   <a href> in prose         → anchor text only (href dropped, mirrors reader-mode)
 *   inline tags               → removed; content kept
 *   HTML entities             → decoded by the parser
 *
 * The anchor-href lift is SCOPED to IOC and References heading sections only.
 */
export const htmlToStructured = (html: string | undefined | null): string => {
  if (!html) return '';
  const first = renderStructured(capInput(html));
  return RESIDUAL_CLOSING_TAG.test(first) ? renderStructured(first) : first;
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
