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

/**
 * Truncate to the parse cap without splitting a surrogate pair.
 *
 * `slice` counts UTF-16 code units, so a cap landing mid-pair left the high half alone and
 * `stripHtml` returned an unpaired surrogate in `body_text`. Same defect `truncate` has,
 * one layer earlier, so fixing it there was not enough.
 */
export const capToParseBytes = (html: string): string => {
  if (html.length <= MAX_PARSE_BYTES) return html;
  const capped = html.slice(0, MAX_PARSE_BYTES);
  return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
};

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
  parent?: ParsedNode | null;
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
/**
 * Elements whose subtree never becomes report text.
 *
 * `script` and `style` because their content is code. `template` because it is inert: the
 * parser puts its children in a document fragment that no reader ever sees, so component
 * templates carrying example or stale URLs were feeding `body_text` values a human never
 * read, which extraction then promoted as indicators.
 *
 * Named for what it does rather than for raw text, since `template` is not a raw-text
 * element and calling it one would invite the next reader to assume its content is
 * unparsed. `noscript` is deliberately absent: its content is fallback that a reader with
 * scripting disabled does see.
 */
const SKIPPED_SUBTREE_NAMES = new Set(['script', 'style', 'template']);

/**
 * Whether this element's content never reaches a reader.
 *
 * Exported and shared with `extract_article` because this rule has now had to be applied in
 * four places: both text walkers, candidate exclusion, and fallback candidate scoring. Each
 * time it was added where a finding pointed, and each time another path was still counting the
 * same text: hidden subtrees took three rounds to cover, and `template` was skipped by the
 * walkers while a `<template class="post-content">` could still win article selection and have
 * its contents returned as the report. One definition, four call sites.
 *
 * `iframe` is here for the same reason as `template`: browsers do not render its contents, so
 * embedded fallback or tracking text was reaching `body_text` and could also outweigh the real
 * report during candidate scoring. Adding it was one line rather than a fifth report, which is
 * what unifying the rule bought.
 */
const NON_RENDERED_NAMES = new Set(['template', 'iframe']);

export const isNonRenderedElement = (node: {
  name?: string;
  attribs?: Record<string, string>;
}): boolean =>
  NON_RENDERED_NAMES.has(node.name?.toLowerCase() ?? '') || node.attribs?.hidden !== undefined;

const isSkippedSubtree = (node: ParsedNode): boolean =>
  SKIPPED_SUBTREE_NAMES.has(elementName(node)) || isNonRenderedElement(node);

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
const RAW_TEXT_TAG_NAMES = ['script', 'style'] as const;

/**
 * Scanned in a single pass rather than matched with a regex.
 *
 * The regex form bounded its attribute run to keep one opener cheap, but it still
 * restarted at every `<script` in the input, and each attempt spent the whole allowance
 * before failing. On `'<script'.repeat(n)` that is about 293 character checks per input
 * byte, or billions inside the 10MB cap: measured 405ms at 896KB, extrapolating to
 * roughly 4.5 seconds of pegged CPU for one page. Linear rather than quadratic, but a
 * constant that large is still a worker the queue does not get back.
 *
 * This visits each character at most once. Attribute scanning stays quote-aware, so a
 * `>` inside an attribute value cannot end a tag early, and an unterminated tag runs to
 * end of input and is left for the parser to read per spec, which is the safe direction.
 */
/**
 * Index of the `>` that terminates the tag starting at `from`, or -1 if the tag never
 * terminates. Quote-aware, so a `>` inside an attribute value does not end it early.
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
 * ASCII-only, length-preserving lowercase.
 *
 * `String.prototype.toLowerCase` is not length preserving: `İ` (U+0130) lowercases to two
 * code units. The scanner took offsets from a lowercased copy and used them to index the
 * original, so a single such character anywhere in the page shifted every offset after it.
 * The enclosing-element check then read the wrong character, a fake `<script/>` inside a
 * real script body got rewritten, and the script suffix escaped into `body_text` as a false
 * IOC. Tag names are ASCII, so folding only A-Z keeps offsets aligned by construction.
 */
const asciiLower = (input: string): string =>
  input.replace(/[A-Z]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 32));

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
      // Comments, CDATA sections and directives are skipped as whole regions rather than
      // scanned for candidates. Identifying an opener from the bytes after `<` alone meant
      // `<!-- <script> -->` registered as a real raw-text opener; it has no matching close,
      // so the scan ran to end of input and never normalized the genuine `<script/>` after
      // it. The parser then read the following paragraph as script content and
      // `<!-- <script> --><script/><p>IOC: evil.test</p>` extracted to nothing at all.
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
        // Any other tag is skipped whole, quote-aware, so a `<script/>` sitting in one of
        // its attribute values is never mistaken for a tag of its own.
        const isTag = /[a-z/]/.test(lower[open + 1] ?? '');
        const otherTagEnd = isTag ? tagEndFrom(html, open + 1).end : -1;

        if (!isTag) {
          // A bare `<` in prose. Advance one character.
          cursor = open + 1;
        } else if (otherTagEnd === -1) {
          // The tag never terminates, so no `>` exists from here on and no later tag can be
          // complete either. Stopping is both correct and what keeps this linear: retrying
          // from the next character rescanned the whole remaining input per position, which
          // on `'<script'.repeat(n)` is quadratic and hung outright at n=512,000.
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
          // A real open tag, so everything up to the matching close is raw text as far as
          // the parser is concerned, and a `<script/>` sitting in a JavaScript string
          // literal is not a tag at all. Rewriting it inserted a close tag *inside* the
          // outer body, ending that element early and spilling the rest of the script into
          // `body_text` as a false IOC. Skip the body instead.
          //
          // The close tag's name has to end at a tag boundary. A bare prefix match accepted
          // `</scriptfoo>`, which resumed the scan inside a body the parser still considers
          // open and let a later `<script/>` there escape the same way.
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
            // where the spec and parse5 both read the junk and close the element. That cost
            // content twice: `</script/>` kept the element open and swallowed the rest of
            // the document, and `</script foo="a>URL">` closed at the `>` inside the
            // attribute value and spilled the remainder into `body_text` as a false IOC.
            // Rewriting a junk-carrying end tag to its plain form is semantically free,
            // since the junk is ignored either way.
            const junkFrom = closeAt + closeTag.length;
            const { end: closeEnd } = tagEndFrom(html, junkFrom);
            if (closeEnd === -1) {
              // The close tag never terminates, so the element stays open to end of input and
              // the remainder is raw text. Resuming at `junkFrom` scanned inside that still-open
              // body, and a `<script/>`-looking string in it got rewritten, which introduced the
              // `>` htmlparser2 needed to end the outer element and spilled the rest of the code
              // into `body_text` as a false indicator. Stop, exactly as the missing-close-tag
              // path above does.
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
/**
 * The single copy of the parser configuration, shared with `extract_article`.
 *
 * It was duplicated per file and the two drifted: `recognizeCDATA` was set here and not
 * there, so one stage saw a CDATA article body and the other saw a comment and discarded
 * it. Any option that changes what the document *contains* has to be identical across
 * stages or they disagree, so there is one copy and it is exported rather than described.
 */
export const PARSER_OPTIONS = {
  _useHtmlParser2: true,
  // HTML treats `<![CDATA[ ... ]]>` as a bogus comment, which is right for a web page and
  // wrong for a feed: RSS and Atom use CDATA precisely to carry an HTML document, and
  // reading it as a comment dropped the whole article body. Only affects `<![CDATA[`;
  // ordinary `<!-- -->` comments still parse as comments and are still discarded.
  recognizeCDATA: true,
} as const;

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
 * closing tag and is left alone.
 *
 * The name pattern admits hyphens, colons, and underscores, because custom and
 * namespaced elements are exactly what vendor feeds encode. Restricting it to
 * `[a-z0-9]*` meant `&lt;ioc-value&gt;evil.com&lt;/ioc-value&gt;` never qualified, so
 * the tags leaked into output that is supposed to be plain text and the structured
 * renderer never reached the custom-element boundaries it applies deliberately.
 *
 * The name is followed by a lookahead for a tag boundary rather than `\s*>`, because an end
 * tag may legally carry junk. Requiring the bracket meant an encoded document whose end tag
 * was `&lt;/script foo&gt;` never qualified, so it was never re-parsed and the script body
 * and its URL stayed in `body_text` for extraction to mine. The raw-parser path already
 * handled that end-tag form; this probe did not, and the two have to agree.
 */
const RESIDUAL_CLOSING_TAG = /<\/[a-z][a-z0-9:_-]*(?=[\s/>])/i;

const payloadCarriesMarkup = (payload: ParsedNode[]): boolean =>
  payload.some((node) => isElement(node) || node.type === 'cdata');

/**
 * Whether a decoded result should be parsed a second time.
 *
 * Markup of its own disqualifies the input, because escaped markup inside a real document
 * is content the author chose to display, and re-parsing it deleted the indicator the report
 * was published to communicate — see `RESIDUAL_CLOSING_TAG`'s doc for the specific case.
 * Otherwise a residual closing tag surviving into the decoded text is the only remaining
 * signal available, since a whole encoded document and an escaped snippet are
 * indistinguishable once decoded.
 */
const shouldReparse = (nodes: ParsedNode[], decoded: string): boolean =>
  !payloadCarriesMarkup(nodes) && RESIDUAL_CLOSING_TAG.test(decoded);

/** Stack entry: a node still to visit, or literal output to append after its subtree. */
type WalkStep =
  | { kind: 'node'; node: ParsedNode; cdataDepth: number }
  | { kind: 'emit'; text: string };

/**
 * How many times a CDATA payload may be expanded into the walk.
 *
 * CDATA cannot legally nest, so a well-formed document needs one. The bound exists because
 * malformed input can look like it nests: `'<![CDATA['.repeat(n)` parses as one unterminated
 * node per pass, and expanding each one re-parsed the remaining text. Measured before the
 * bound at 10ms for n=200, 740ms for n=2,000, and a hard `RangeError` at n=20,000.
 *
 * Past the bound the payload is dropped rather than emitted as text. Emitting it was the
 * first thing I tried and it was worse than the bug: unparsed markup went into `body_text`,
 * so `<![CDATA[` five deep around `<script>fetch("https://attacker.test")</script>` handed
 * extraction the attacker's URL as an indicator. Dropping cannot lose real report content,
 * because CDATA does not nest at all and anything past four levels is malformed by
 * construction.
 */
const MAX_CDATA_DEPTH = 4;

/**
 * Pushed in reverse so the stack pops in document order.
 *
 * The walks in this file are iterative rather than recursive on purpose. This content is
 * attacker-controlled and the parser imposes no nesting limit, so `'<div>'.repeat(n)`
 * builds an arbitrarily deep tree; a recursive walk would exhaust the call stack and
 * take the task worker down with it.
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
 * Concatenated text of a subtree, ignoring element structure.
 *
 * Used for CDATA, whose payload the parser hands back as opaque text rather than as a
 * parsed subtree.
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
 * Parse a CDATA payload into nodes.
 *
 * RSS and Atom carry an entire HTML document inside `<![CDATA[ ... ]]>`, and the parser
 * hands the payload back as opaque text rather than a parsed subtree, so it has to be
 * parsed or the whole article body is lost. CDATA content is also literal, so a document
 * that entity-encoded its body *and* wrapped it in CDATA arrives with the markup still
 * encoded after one parse: `<![CDATA[&lt;script&gt;fetch("…")&lt;/script&gt;safe]]>` would
 * otherwise yield the script body and its URL as visible text. Same decision `shouldReparse`
 * makes on a top-level document, applied to the payload, and bounded to one extra parse.
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
        // RSS and Atom carry an entire HTML document inside `<![CDATA[ ... ]]>`, and the
        // parser hands the payload back as opaque text rather than a parsed subtree, so it
        // has to be parsed or the whole article body is lost.
        //
        // Parsed into *this* walk rather than by re-entering the parser. Recursing undid the
        // iterative guarantee the rest of this file maintains: malformed nesting overflowed
        // the stack outright, and it also meant the payload was walked with `liftHrefs`
        // forced off, so an anchor inside CDATA under an IOC heading lost its href.
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(stack, parseCdataPayload(rawTextOf(childrenOf(node))), cdataDepth + 1);
        }
      } else if (!isElement(node)) {
        // Comments and directives carry no report text, but they did separate
        // the text on either side, so they still emit a boundary. Dropping the node
        // wholesale is what keeps `<!-- hidden > c2.evil.test -->` from being extracted
        // as a live IOC; emitting the boundary is what keeps `evil.com<!-- x -->bad.net`
        // from merging into one unextractable token.
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
  const nodes = parseTopLevelNodes(capToParseBytes(html));
  const first = inlineTextOf(nodes, false);
  const reparse = shouldReparse(nodes, first);
  return collapseWhitespace(reparse ? extractPlainText(first) : first);
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
  // `slice` counts UTF-16 code units, so a cap landing inside a surrogate pair kept the
  // high half on its own: `truncate('a\u{1F600}b', 3)` stored an unpaired surrogate,
  // which renders as a replacement character and is not valid UTF-8 for anything reading
  // the field downstream. Dropping the orphan costs one code unit. Done before the
  // word-boundary logic so that still operates on well-formed text.
  const rawSlice = input.slice(0, contentLength);
  const slice = /[\uD800-\uDBFF]$/.test(rawSlice) ? rawSlice.slice(0, -1) : rawSlice;
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
      const { node, cdataDepth } = step;
      const name = elementName(node);
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = sectionKind === 'ioc' || sectionKind === 'references';

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (node.type === 'cdata') {
        // Same as the plain-text walker, and parsed into this walk for the same reasons.
        // Re-entering `renderStructured` also started a fresh walk whose section state was
        // `prose`, so CDATA sitting under an `<h2>Indicators of Compromise</h2>` was
        // rendered as prose and every href-only indicator inside it was dropped. Section
        // state is walker-local, so feeding the nodes into this stack inherits it.
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
        pushNodes(stack, childrenOf(node), cdataDepth);
      } else if (INLINE_NAMES.has(name)) {
        // Inline element: no boundary, contents kept.
        pushNodes(stack, childrenOf(node), cdataDepth);
      } else {
        // Unknown or custom element. Same conservative default as the plain-text
        // walker: treating these as inline merged adjacent indicators, so
        // `<ioc-value>evil.com</ioc-value><ioc-value>bad.net</ioc-value>` came out as
        // `evil.combad.net`. Vendor web components make that common, and it defeats the
        // one thing this structured form exists to preserve.
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
