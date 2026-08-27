/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import { classifyHeader, type SectionKind } from './section_headers';

/**
 * Largest input the parsers will touch, matching the `body_html` bound the report API
 * already enforces. Input is an attacker-influenced fetched page, and this runs in a task
 * worker where cheerio builds a full DOM, so truncating degrades a fat page instead of
 * failing it outright.
 */
export const MAX_PARSE_BYTES = 10 * 1024 * 1024;

/**
 * Truncates without splitting a surrogate pair — `slice` counts UTF-16 code units, so a
 * cap landing mid-pair would otherwise leave an unpaired surrogate in `body_text`.
 */
export const capToParseBytes = (html: string): string => {
  if (html.length <= MAX_PARSE_BYTES) return html;
  const capped = html.slice(0, MAX_PARSE_BYTES);
  return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
};

/**
 * Elements that carry no token boundary; everything else does, so `c2.<strong>evil</strong>.test`
 * extracts as `c2.evil.test` rather than three separate words. An allowlist rather than a
 * blocklist, since an unknown or custom element defaulting to a boundary only risks
 * splitting one token, where the reverse would silently merge two indicators into one.
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
 * Minimal shape of a parsed DOM node, declared here rather than imported from cheerio: a
 * transitive `@types/cheerio@0.22` shadows the types bundled with the installed
 * cheerio 1.0.0-rc.12, and `security_solution` doesn't pin the tsconfig `types` array that
 * would resolve the correct ones.
 */
interface ParsedNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  parent?: ParsedNode | null;
  children?: ParsedNode[];
}

/**
 * Elements whose subtree never becomes report text: `script`/`style` because their content
 * is code, `template` because the parser puts its children in an inert fragment no reader
 * sees. Skipped during the walk rather than removed up front with a selector — a `.remove()`
 * pass is quadratic in nesting depth, where skipping in the walk is O(1) per node. This also
 * makes truncation safe: a document cut mid-`<script>` at `MAX_PARSE_BYTES` is read as raw
 * script text by the parser rather than leaking into report text. `noscript` is deliberately
 * absent — its content is fallback a scripting-disabled reader does see.
 */
const SKIPPED_SUBTREE_NAMES = new Set(['script', 'style', 'template']);

/**
 * Whether this element's content never reaches a reader. Exported and shared with
 * `extract_article`, which needs the same rule for candidate exclusion and scoring so a
 * `<template>` or hidden block can't win article selection there either. `iframe` is here
 * for the same reason as `template`: browsers don't render its contents.
 */
const NON_RENDERED_NAMES = new Set(['template', 'iframe']);

export const isNonRenderedElement = (node: {
  name?: string;
  attribs?: Record<string, string>;
}): boolean =>
  NON_RENDERED_NAMES.has(node.name?.toLowerCase() ?? '') || node.attribs?.hidden !== undefined;

const isSkippedSubtree = (node: ParsedNode): boolean =>
  SKIPPED_SUBTREE_NAMES.has(elementName(node)) || isNonRenderedElement(node);

/** `<script>`/`<style>` — the elements HTML treats as raw text. */
const RAW_TEXT_TAG_NAMES = ['script', 'style'] as const;

/**
 * Index of the `>` that terminates the tag starting at `from`, in one linear scan rather
 * than a regex per candidate (a regex restarting at every `<script` opener is quadratic
 * over an adversarial repeat). Quote-aware, so a `>` inside an attribute value can't end
 * the tag early; an unterminated tag runs to end of input and is left for the parser to
 * read per spec, which is the safe direction.
 */
interface TagEnd {
  /** Index of the `>` that terminates the tag, or -1 if it never terminates. */
  end: number;
  /** Whether the tag carries a real self-closing flag. */
  selfClosing: boolean;
}

const tagEndFrom = (html: string, from: number): TagEnd => {
  let scan = from;
  let quote = '';
  // In HTML an unquoted attribute value may contain `/`, so a trailing slash there belongs to the
  // value rather than being a self-closing flag. Reading `<script src=x/>` as self-closing
  // rewrote it to an empty script pair, which exposed the real script body as report text with
  // its URL in it.
  let expectingValue = false;
  let inUnquotedValue = false;

  while (scan < html.length) {
    const char = html[scan];

    if (quote !== '') {
      if (char === quote) quote = '';
    } else if (char === '>') {
      return { end: scan, selfClosing: !inUnquotedValue && html[scan - 1] === '/' };
    } else if (char === '"' || char === "'") {
      quote = char;
      expectingValue = false;
    } else if (char === '=') {
      expectingValue = true;
      inUnquotedValue = false;
    } else if (/\s/.test(char)) {
      inUnquotedValue = false;
    } else if (expectingValue) {
      expectingValue = false;
      inUnquotedValue = true;
    }

    scan += 1;
  }

  return { end: -1, selfClosing: false };
};

/**
 * ASCII-only, length-preserving lowercase. `String.prototype.toLowerCase` is not
 * length-preserving (`İ` lowercases to two code units), which would shift every later
 * offset the scanner takes from this copy and applies back to the original. Tag names are
 * ASCII, so folding only A-Z keeps offsets aligned by construction.
 */
const asciiLower = (input: string): string =>
  input.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));

/**
 * Rewrites an explicitly self-closed `<script/>` or `<style/>` into an empty element pair
 * before parsing. HTML has no self-closing syntax for raw-text elements, so a
 * spec-compliant parser reads `<script src="x.js"/><p>evil.test</p>` as a script whose
 * body is that paragraph, discarding the rest of the document. Feeds routinely ship XHTML,
 * where the form is legitimately self-closing, so the HTML reading has to be corrected
 * before the real parser ever sees it.
 */
export const normalizeSelfClosedRawText = (html: string): string => {
  const lower = asciiLower(html);
  const pieces: string[] = [];
  let copiedTo = 0;
  let cursor = 0;

  while (cursor < html.length) {
    const open = lower.indexOf('<', cursor);

    if (open === -1) {
      cursor = html.length;
    } else if (lower.startsWith('<!--', open)) {
      // Comments, CDATA sections and directives are skipped as whole regions, since a
      // `<script>`-looking opener inside a comment has no matching close and would run
      // the scan to end of input, never reaching a genuine opener after it.
      const commentEnd = lower.indexOf('-->', open + 4);
      cursor = commentEnd === -1 ? html.length : commentEnd + 3;
    } else if (lower.startsWith('<![cdata[', open)) {
      const cdataEnd = lower.indexOf(']]>', open + 9);
      cursor = cdataEnd === -1 ? html.length : cdataEnd + 3;
    } else if (lower.startsWith('<!', open) || lower.startsWith('<?', open)) {
      const directiveEnd = lower.indexOf('>', open + 2);
      cursor = directiveEnd === -1 ? html.length : directiveEnd + 1;
    } else {
      const name = RAW_TEXT_TAG_NAMES.find((candidate) => lower.startsWith(`<${candidate}`, open));
      const afterName = name === undefined ? -1 : open + 1 + name.length;
      // A tag boundary has to follow the name, or `<scriptfoo` would be treated as one.
      const isRawTextStart =
        afterName !== -1 && (afterName >= html.length || /[\s/>]/.test(html[afterName]));

      if (!isRawTextStart) {
        // Any other tag is skipped whole, quote-aware, so a `<script/>` inside one of its
        // attribute values is never mistaken for a tag of its own.
        const isTag = /[a-z/]/.test(lower[open + 1] ?? '');
        const otherTagEnd = isTag ? tagEndFrom(html, open + 1).end : -1;

        if (!isTag) {
          // A bare `<` in prose. Advance one character.
          cursor = open + 1;
        } else if (otherTagEnd === -1) {
          // No `>` exists from here on, so no later tag can be complete either — stop
          // rather than retry per position, which would be quadratic.
          cursor = html.length;
        } else {
          cursor = otherTagEnd + 1;
        }
      } else {
        const { end: tagEnd, selfClosing } = tagEndFrom(html, afterName);

        if (tagEnd === -1) {
          cursor = html.length;
        } else if (selfClosing) {
          // The self-closed open tag this function exists for.
          pieces.push(html.slice(copiedTo, tagEnd - 1), `></${name}>`);
          copiedTo = tagEnd + 1;
          cursor = tagEnd + 1;
        } else {
          // A real open tag, so its raw-text body is skipped rather than scanned for a
          // `<script/>`-looking string, which is not a tag inside a JS string literal.
          // The close tag's name has to end at a tag boundary too, or `</scriptfoo>` would
          // be accepted and the scan would resume inside a body the parser still considers
          // open.
          const closeTag = `</${name}`;
          let searchFrom = tagEnd + 1;
          let closeAt = -1;
          while (closeAt === -1 && searchFrom < html.length) {
            const found = lower.indexOf(closeTag, searchFrom);
            const after = found === -1 ? -1 : found + closeTag.length;
            if (found === -1) {
              searchFrom = html.length;
            } else if (after >= html.length || /[\s/>]/.test(html[after])) {
              closeAt = found;
            } else {
              searchFrom = found + 1;
            }
          }

          if (closeAt === -1) {
            cursor = html.length;
          } else {
            // htmlparser2 ends an end tag at the first `>` and rejects a trailing slash,
            // where the spec and parse5 both read the junk and close the element. Rewriting
            // a junk-carrying end tag to its plain form is semantically free either way, and
            // avoids the element staying open (`</script/>`) or closing early inside a junk
            // attribute value (`</script foo="a>URL">`).
            const junkFrom = closeAt + closeTag.length;
            const { end: closeEnd } = tagEndFrom(html, junkFrom);
            if (closeEnd === -1) {
              // The close tag itself never terminates — same as the missing-close-tag path
              // above, stop rather than resume the scan inside a still-open body.
              cursor = html.length;
            } else if (closeEnd > junkFrom) {
              pieces.push(html.slice(copiedTo, closeAt), `</${name}>`);
              copiedTo = closeEnd + 1;
              cursor = closeEnd + 1;
            } else {
              cursor = junkFrom;
            }
          }
        }
      }
    }
  }

  if (copiedTo === 0) return html;
  pieces.push(html.slice(copiedTo));
  return pieces.join('');
};

/**
 * The single copy of the parser configuration, shared with `extract_article` so the two
 * can't drift on what a document *contains* (they did once, over `recognizeCDATA`, and
 * disagreed about whether a feed body was CDATA or a comment).
 *
 * `_useHtmlParser2: true` picks htmlparser2 over cheerio's default parse5: parse5's tree
 * construction walks the open-element stack per step, making it quadratic in nesting depth,
 * where htmlparser2 is linear over the same adversarial input. Fragment mode
 * (`isDocument: false`, the default) keeps a `<description>` snippet or a bare `<tr>` intact
 * rather than wrapped in `<html>/<head>/<body>`.
 */
export const PARSER_OPTIONS = {
  _useHtmlParser2: true,
  // RSS and Atom use CDATA to carry an HTML document; HTML treats it as a bogus comment,
  // which would drop the whole body. Only affects `<![CDATA[` — `<!-- -->` still discards.
  recognizeCDATA: true,
} as const;

const parseTopLevelNodes = (html: string): ParsedNode[] => {
  const $ = cheerio.load(normalizeSelfClosedRawText(html), PARSER_OPTIONS);
  // The one cast in this file, at the boundary where the stale typings stop describing
  // the runtime: `toArray()` is declared, its element type is not.
  const roots = $.root().toArray() as unknown as ParsedNode[];
  return roots.flatMap((root) => root.children ?? []);
};

const isElement = (node: ParsedNode): boolean =>
  node.type === 'tag' || node.type === 'script' || node.type === 'style';

const elementName = (node: ParsedNode): string => node.name?.toLowerCase() ?? '';

const childrenOf = (node: ParsedNode): ParsedNode[] => node.children ?? [];

/**
 * A closing tag surviving into decoded text means the input carried entity-encoded
 * markup that the parser correctly decoded to text — e.g. an RSS `<description>` with a
 * whole HTML body inside it. Requiring a closing tag (not just an opening one) is what
 * keeps prose safe: `use &lt;script&gt; carefully` decodes with no closing tag and is left
 * alone. The name pattern allows hyphens/colons/underscores for custom and namespaced
 * elements, and looks ahead for a tag boundary rather than requiring `>` directly, since an
 * end tag may legally carry junk (`&lt;/script foo&gt;`).
 */
const RESIDUAL_CLOSING_TAG = /<\/[a-z][a-z0-9:_-]*(?=[\s/>])/i;

const payloadCarriesMarkup = (payload: ParsedNode[]): boolean =>
  payload.some((node) => isElement(node) || node.type === 'cdata');

/**
 * Whether a decoded result should be parsed a second time. Markup of its own disqualifies
 * the input — escaped markup inside a real document is content the author chose to
 * display, and re-parsing it would delete that content. Otherwise a residual closing tag
 * is the only remaining signal, since a whole encoded document and an escaped snippet are
 * indistinguishable once decoded.
 */
const shouldReparse = (nodes: ParsedNode[], decoded: string): boolean =>
  !payloadCarriesMarkup(nodes) && RESIDUAL_CLOSING_TAG.test(decoded);

/** Stack entry: a node still to visit, or literal output to append after its subtree. */
type WalkStep =
  | { kind: 'node'; node: ParsedNode; cdataDepth: number }
  | { kind: 'emit'; text: string };

/**
 * How many times a CDATA payload may be expanded into the walk. CDATA can't legally nest,
 * so a well-formed document needs one; the bound exists because malformed input can look
 * like it nests (`'<![CDATA['.repeat(n)`). Past the bound the payload is dropped rather
 * than emitted as text — dropping can't lose real content, since CDATA never nests this
 * deep legitimately, where emitting unparsed markup would hand extraction a live indicator.
 */
const MAX_CDATA_DEPTH = 4;

/**
 * Pushed in reverse so the stack pops in document order. The walks in this file are
 * iterative rather than recursive on purpose: this content is attacker-controlled with no
 * nesting limit, and a recursive walk would exhaust the call stack.
 */
const pushNodes = (stack: WalkStep[], nodes: ParsedNode[], cdataDepth = 0): void => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push({ kind: 'node', node: nodes[i], cdataDepth });
  }
};

const hrefOf = (node: ParsedNode): string | undefined => {
  const href = node.attribs?.href;
  return typeof href === 'string' && href.length > 0 ? href : undefined;
};

/**
 * Concatenated text of a subtree, ignoring element structure. Used for CDATA, whose
 * payload the parser hands back as opaque text rather than a parsed subtree.
 */
const rawTextOf = (nodes: ParsedNode[]): string => {
  const out: string[] = [];
  const stack: ParsedNode[] = [...nodes].reverse();

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node.type === 'text') {
      out.push(node.data ?? '');
    } else {
      const children = childrenOf(node);
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }

  return out.join('');
};

/**
 * Parses a CDATA payload into nodes. RSS and Atom carry an entire HTML document inside
 * `<![CDATA[ ... ]]>`, so it has to be parsed or the article body is lost. CDATA content
 * is also literal, so a document that entity-encoded its body *and* wrapped it in CDATA
 * arrives still encoded after one parse — the same `shouldReparse` decision, applied here
 * to the payload and bounded to one extra parse.
 */
const parseCdataPayload = (raw: string): ParsedNode[] => {
  const nodes = parseTopLevelNodes(raw);
  if (payloadCarriesMarkup(nodes)) return nodes;
  return parseTopLevelNodes(inlineTextOf(nodes, false));
};

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
      const { node, cdataDepth } = step;
      const liftedHref =
        isElement(node) && liftHrefs && elementName(node) === 'a' ? hrefOf(node) : undefined;

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (node.type === 'cdata') {
        // Parsed into *this* walk rather than by re-entering the parser, which would undo
        // the iterative guarantee this file maintains and force `liftHrefs` off for the
        // payload.
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(stack, parseCdataPayload(rawTextOf(childrenOf(node))), cdataDepth + 1);
        }
      } else if (!isElement(node)) {
        // Comments and directives carry no report text but still separate the text on
        // either side, so a boundary is emitted without the node itself.
        out.push(' ');
      } else if (isSkippedSubtree(node)) {
        out.push(' ');
      } else if (liftedHref !== undefined) {
        out.push(` ${collapseWhitespace(inlineTextOf(childrenOf(node), false))} ${liftedHref} `);
      } else if (INLINE_NAMES.has(elementName(node))) {
        pushNodes(stack, childrenOf(node), cdataDepth);
      } else {
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        pushNodes(stack, childrenOf(node), cdataDepth);
      }
    }
  }

  return out.join('');
};

const extractPlainText = (html: string): string => inlineTextOf(parseTopLevelNodes(html), false);

/**
 * Strips HTML tags and decodes entities into the plain text stored as `content.body_text`,
 * which feeds inference and IOC regex extraction and so needs intact token boundaries
 * rather than intact markup. The original HTML is preserved separately as
 * `content.body_html` (mapped `index: false`) for archival — it's unsanitized
 * attacker-controlled markup and must never be rendered.
 */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  const nodes = parseTopLevelNodes(capToParseBytes(html));
  const first = inlineTextOf(nodes, false);
  const reparse = shouldReparse(nodes, first);
  return collapseWhitespace(reparse ? extractPlainText(first) : first);
};

/**
 * Collapses whitespace runs (including unicode separators) and trims. A naive `\s+` would
 * leave the leading/trailing whitespace a CDATA payload introduces.
 */
export const collapseWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

/**
 * Truncates to a max length, keeping a sensible word boundary if one lands close to the
 * cap. Titles are semantic_text so shorter strings save inference tokens.
 */
export const truncate = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) return input;
  if (maxLength <= 0) return '';
  // Reserved so the appended ellipsis doesn't push the result one character over the cap.
  const contentLength = maxLength - 1;
  // `slice` counts UTF-16 code units, so a cap inside a surrogate pair would otherwise
  // leave an unpaired one. Done before the word-boundary logic so that operates on
  // well-formed text.
  const rawSlice = input.slice(0, contentLength);
  const slice = /[\uD800-\uDBFF]$/.test(rawSlice) ? rawSlice.slice(0, -1) : rawSlice;
  const lastBoundary = slice.lastIndexOf(' ');
  // Only honor the boundary if it's reasonably close to the cap, or a title like
  // "x ".repeat(N) + "very long word" would shrink to two characters.
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
  // Section state, advanced in document order as headings are met. A classified heading
  // becomes the anchor for everything below it; a deeper unclassified heading is its
  // subsection and doesn't reset the anchor.
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
      const { node, cdataDepth } = step;
      const name = elementName(node);
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = sectionKind === 'ioc' || sectionKind === 'references';

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (node.type === 'cdata') {
        // Same as the plain-text walker. Parsed into this walk rather than by re-entering
        // `renderStructured`, which would start a fresh walk with section state reset to
        // `prose` and lose the current heading's anchor.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(stack, parseCdataPayload(rawTextOf(childrenOf(node))), cdataDepth + 1);
        }
      } else if (!isElement(node)) {
        // Comments and doctype contribute a boundary only.
        out.push(' ');
      } else if (isSkippedSubtree(node)) {
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
        // Prose anchors collapse to visible text only, so ordinary citation links don't
        // flood extraction with reference noise.
        out.push(href !== undefined ? `${text} ${href} ` : `${text} `);
      } else if (name === 'br') {
        out.push('\n');
      } else if (BLOCK_NAMES.has(name)) {
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth);
      } else if (INLINE_NAMES.has(name)) {
        // Inline element: no boundary, contents kept.
        pushNodes(stack, childrenOf(node), cdataDepth);
      } else {
        // Unknown or custom element: same conservative default as the plain-text walker.
        // Treating these as inline would merge adjacent indicators in vendor web
        // components, which is exactly what this structured form exists to keep separate.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth);
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
 * Converts HTML to a structured text form that preserves block boundaries, table rows,
 * headers, and lists, so IOC extraction can see table-cell values as recoverable tokens
 * rather than a collapsed space-run. TRANSIENT — used only inside `extract_iocs`, never
 * stored or indexed; `body_text`/`stripHtml` are unaffected.
 *
 *   <script>/<style>          → removed as whole elements
 *   <h1>–<h6>                 → ## heading text
 *   <tr> with <td>/<th> cells → | cell1 | cell2 | pipe-delimited row
 *   <li>                      → - item text
 *   block elements (p, div, br, …) → newline boundary
 *   <a href> in IOC/References sections → "anchortext URL" (href lifted as token)
 *   <a href> in prose         → anchor text only
 *   inline tags               → removed; content kept
 *   HTML entities             → decoded by the parser
 */
export const htmlToStructured = (html: string | undefined | null): string => {
  if (!html) return '';
  const capped = capToParseBytes(html);
  const first = renderStructured(capped);
  const reparse = shouldReparse(parseTopLevelNodes(capped), first);
  return reparse ? renderStructured(first) : first;
};

/** `content` block written by every ingest path (adapters + manual ingest). */
export interface ReportContentDocument {
  title: string;
  body_text: string;
  body_html?: string;
  language: string;
  /**
   * Set when `body_text` is the title rather than a real body, so a consumer can tell a
   * headline-only report from one that genuinely repeats its title and skip or cheapen
   * enrichment accordingly. Present only when true.
   */
  body_is_title_fallback?: true;
}

/**
 * Builds the `content` object for a threat report. `content.title_bm25` /
 * `content.body_text_bm25` siblings are populated by Elasticsearch `copy_to` on index (see
 * `setup/index_templates.ts`).
 *
 * An empty `body_text` falls back to the title: every enrichment route requires
 * non-empty text, so a report stored with none would stay `pending` forever. Title-only
 * entries are common in feeds that carry only a headline and a link. Done here rather
 * than per adapter so every adapter gets it.
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
