/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHtml, type ParsedNode } from './html_parser';
import { elementRenderState } from './inline_style';
import { classifyHeader, type SectionKind } from './section_headers';

/**
 * Largest input the parsers will touch, matching the `body_html` bound the report API
 * already enforces. Input is an attacker-influenced fetched page, and this runs in a task
 * worker where cheerio builds a full DOM, so truncating degrades a fat page instead of
 * failing it outright.
 */
export const MAX_PARSE_BYTES = 10 * 1024 * 1024;

/**
 * Truncates at a UTF-8 boundary. JavaScript string length counts UTF-16 code units, so using
 * it as a byte count let a 10MB cap admit up to 30MB of input before building the DOM.
 */
export const capToParseBytes = (html: string): string => {
  // Every UTF-16 code unit is at most three UTF-8 bytes (a surrogate pair is four bytes
  // across two units), so the common small-input path needs no scan at all.
  if (html.length <= Math.floor(MAX_PARSE_BYTES / 3)) return html;

  let bytes = 0;
  let index = 0;
  while (index < html.length) {
    const codeUnit = html.charCodeAt(index);
    const isSurrogatePair =
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < html.length &&
      html.charCodeAt(index + 1) >= 0xdc00 &&
      html.charCodeAt(index + 1) <= 0xdfff;
    const width = codeUnit <= 0x7f ? 1 : codeUnit <= 0x7ff ? 2 : isSurrogatePair ? 4 : 3;
    if (bytes + width > MAX_PARSE_BYTES) return html.slice(0, index);
    bytes += width;
    index += isSurrogatePair ? 2 : 1;
  }

  return html;
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

/** Skipped during the walk so deep input never pays recursive DOM removal cost. */
const SKIPPED_SUBTREE_NAMES = new Set(['script', 'style', 'template']);
const LITERAL_TEXT_NAMES = new Set(['plaintext', 'xmp']);

const isAlwaysSkippedSubtree = (node: ParsedNode): boolean =>
  SKIPPED_SUBTREE_NAMES.has(elementName(node));

interface ParsedFragment {
  nodes: ParsedNode[];
  hasUnclosedRawText: boolean;
}

const parseFragment = (html: string): ParsedFragment => {
  const { nodes, hasUnclosedRawText } = parseHtml(html);
  return { nodes, hasUnclosedRawText };
};

const parseTopLevelNodes = (html: string): ParsedNode[] => parseFragment(html).nodes;

const isElement = (node: ParsedNode): boolean =>
  node.type === 'tag' || node.type === 'script' || node.type === 'style';

const elementName = (node: ParsedNode): string => node.name?.toLowerCase() ?? '';

const childrenOf = (node: ParsedNode): ParsedNode[] => node.children ?? [];

const renderStateFor = (node: ParsedNode, parentVisible: boolean) =>
  isElement(node)
    ? elementRenderState(node, parentVisible)
    : { subtreeHidden: false, visible: parentVisible };

const shouldEmitHref = (href: string | undefined, text: string, visible: boolean): boolean =>
  href !== undefined && (visible || text.length > 0);

/**
 * A closing tag surviving into decoded text means the input carried entity-encoded
 * markup that the parser correctly decoded to text — e.g. an RSS `<description>` with a
 * whole HTML body inside it. Requiring a closing tag (not just an opening one) is what
 * keeps prose safe: `use &lt;script&gt; carefully` decodes with no closing tag and is left
 * alone. The name pattern allows hyphens/colons/underscores for custom and namespaced
 * elements, and looks ahead for a tag boundary rather than requiring `>` directly, since an
 * end tag may legally carry junk (`&lt;/script foo&gt;`).
 */
const RESIDUAL_CLOSING_TAG = /<\/[a-z][a-z0-9:_-]*(?=[ \t\r\n\f/>])/i;

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
  | { kind: 'node'; node: ParsedNode; cdataDepth: number; visible: boolean }
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
const pushNodes = (
  stack: WalkStep[],
  nodes: ParsedNode[],
  cdataDepth = 0,
  visible = true
): void => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push({ kind: 'node', node: nodes[i], cdataDepth, visible });
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
 * to the payload and bounded to one extra parse. A successfully tokenized, unclosed
 * `<script>` or `<style>` stays literal for feed compatibility, while a tokenizer failure
 * produces no nodes and therefore no extractable text.
 */
const parseCdataPayload = (raw: string): ParsedNode[] => {
  const parsed = parseFragment(raw);
  if (parsed.hasUnclosedRawText) return [{ type: 'text', data: raw }];
  if (payloadCarriesMarkup(parsed.nodes)) return parsed.nodes;

  const decoded = inlineTextOf(parsed.nodes, false);
  const reparsed = parseFragment(decoded);
  return reparsed.hasUnclosedRawText ? [{ type: 'text', data: decoded }] : reparsed.nodes;
};

const inlineTextOf = (
  nodes: ParsedNode[],
  liftHrefs: boolean,
  inheritedVisibility = true
): string => {
  const out: string[] = [];
  const stack: WalkStep[] = [];
  pushNodes(stack, nodes, 0, inheritedVisibility);

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;

    if (step.kind === 'emit') {
      out.push(step.text);
    } else {
      const { node, cdataDepth, visible: parentVisible } = step;
      const renderState = renderStateFor(node, parentVisible);
      const { visible } = renderState;
      if (node.type === 'text') {
        if (visible) out.push(node.data ?? '');
      } else if (node.type === 'cdata') {
        // Parsed into *this* walk rather than by re-entering the parser, which would undo
        // the iterative guarantee this file maintains and force `liftHrefs` off for the
        // payload.
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(stack, parseCdataPayload(rawTextOf(childrenOf(node))), cdataDepth + 1, visible);
        }
      } else if (!isElement(node)) {
        // Comments and directives carry no report text but still separate the text on
        // either side, so a boundary is emitted without the node itself.
        out.push(' ');
      } else if (isAlwaysSkippedSubtree(node) || renderState.subtreeHidden) {
        out.push(' ');
      } else if (LITERAL_TEXT_NAMES.has(elementName(node))) {
        if (visible) out.push(rawTextOf(childrenOf(node)));
      } else if (liftHrefs && elementName(node) === 'a') {
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), false, visible));
        const href = hrefOf(node);
        if (shouldEmitHref(href, text, visible)) out.push(` ${text} ${href} `);
        else if (!visible) out.push(' ');
      } else if (INLINE_NAMES.has(elementName(node))) {
        if (!visible) {
          out.push(' ');
          stack.push({ kind: 'emit', text: ' ' });
        }
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
      } else {
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
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

interface StructuredSectionState {
  kind: SectionKind;
  depth: number;
}

const renderHeading = (
  node: ParsedNode,
  name: string,
  visible: boolean,
  state: StructuredSectionState,
  out: string[]
): void => {
  const text = collapseWhitespace(inlineTextOf(childrenOf(node), false, visible));
  if (!text) return;

  const depth = Number(name.slice(1));
  const classified = classifyHeader(text);
  if (classified !== 'prose') {
    state.kind = classified;
    state.depth = depth;
  } else if (state.kind === 'prose' || depth <= state.depth) {
    state.kind = 'prose';
    state.depth = depth;
  }
  out.push(`\n## ${text}\n`);
};

const renderStructuredElement = ({
  node,
  name,
  visible,
  lift,
  cdataDepth,
  state,
  out,
  stack,
}: {
  node: ParsedNode;
  name: string;
  visible: boolean;
  lift: boolean;
  cdataDepth: number;
  state: StructuredSectionState;
  out: string[];
  stack: WalkStep[];
}): void => {
  if (HEADING_NAMES.has(name)) {
    renderHeading(node, name, visible, state, out);
  } else if (name === 'tr') {
    const cellTexts = childrenOf(node)
      .filter((child) => ['td', 'th'].includes(elementName(child)))
      .flatMap((cell) => {
        const cellRenderState = elementRenderState(cell, visible);
        if (cellRenderState.subtreeHidden) return [];
        return [collapseWhitespace(inlineTextOf(childrenOf(cell), lift, cellRenderState.visible))];
      });
    out.push(cellTexts.length > 0 ? `\n| ${cellTexts.join(' | ')} |\n` : '\n');
  } else if (name === 'li') {
    const text = collapseWhitespace(inlineTextOf(childrenOf(node), lift, visible));
    if (text) out.push(`\n- ${text}\n`);
  } else if (name === 'a') {
    const text = collapseWhitespace(inlineTextOf(childrenOf(node), false, visible));
    const href = lift && (visible || text.length > 0) ? hrefOf(node) : undefined;
    out.push(href !== undefined ? `${text} ${href} ` : `${text} `);
  } else if (name === 'br') {
    out.push('\n');
  } else if (BLOCK_NAMES.has(name)) {
    out.push('\n');
    stack.push({ kind: 'emit', text: '\n' });
    pushNodes(stack, childrenOf(node), cdataDepth, visible);
  } else if (INLINE_NAMES.has(name)) {
    if (!visible) {
      out.push('\n');
      stack.push({ kind: 'emit', text: '\n' });
    }
    pushNodes(stack, childrenOf(node), cdataDepth, visible);
  } else {
    out.push('\n');
    stack.push({ kind: 'emit', text: '\n' });
    pushNodes(stack, childrenOf(node), cdataDepth, visible);
  }
};

const renderStructured = (nodes: ParsedNode[]): string => {
  // Section state, advanced in document order as headings are met. A classified heading
  // becomes the anchor for everything below it; a deeper unclassified heading is its
  // subsection and doesn't reset the anchor.
  const section: StructuredSectionState = { kind: 'prose', depth: 0 };

  const out: string[] = [];
  const stack: WalkStep[] = [];
  pushNodes(stack, nodes);

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;

    if (step.kind === 'emit') {
      out.push(step.text);
    } else {
      const { node, cdataDepth, visible: parentVisible } = step;
      const name = elementName(node);
      const renderState = renderStateFor(node, parentVisible);
      const { visible } = renderState;
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = section.kind === 'ioc' || section.kind === 'references';

      if (node.type === 'text') {
        if (visible) out.push(node.data ?? '');
      } else if (node.type === 'cdata') {
        // Same as the plain-text walker. Parsed into this walk rather than by re-entering
        // `renderStructured`, which would start a fresh walk with section state reset to
        // `prose` and lose the current heading's anchor.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(stack, parseCdataPayload(rawTextOf(childrenOf(node))), cdataDepth + 1, visible);
        }
      } else if (!isElement(node)) {
        // Comments and doctype contribute a boundary only.
        out.push(' ');
      } else if (isAlwaysSkippedSubtree(node) || renderState.subtreeHidden) {
        out.push(' ');
      } else if (LITERAL_TEXT_NAMES.has(name)) {
        if (visible) out.push(rawTextOf(childrenOf(node)));
      } else {
        renderStructuredElement({
          node,
          name,
          visible,
          lift,
          cdataDepth,
          state: section,
          out,
          stack,
        });
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
  const nodes = parseTopLevelNodes(capToParseBytes(html));
  const first = renderStructured(nodes);
  const reparse = shouldReparse(nodes, first);
  return reparse ? renderStructured(parseTopLevelNodes(first)) : first;
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
  const hasBody = bodyText.trim().length > 0;
  const hasTitle = title.trim().length > 0;
  // A title fallback needs a real title to fall back to. Without this, a report with
  // both fields empty stored an empty body_text (unavoidable — there's nothing to
  // substitute) but was still labeled a title fallback, which is a real headline-only
  // report to a consumer deciding whether to skip or cheapen enrichment.
  const isTitleFallback = !hasBody && hasTitle;
  return {
    title,
    body_text: hasBody ? bodyText : title,
    ...(bodyHtml !== undefined ? { body_html: bodyHtml } : {}),
    language,
    // Observable rather than silent: a consumer can skip or cheapen enrichment
    // instead of paying to run inference over the title twice.
    ...(isTitleFallback ? { body_is_title_fallback: true as const } : {}),
  };
};
