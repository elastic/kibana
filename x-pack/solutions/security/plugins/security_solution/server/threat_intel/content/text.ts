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
 */
export const isNonRenderedElement = (node: {
  name?: string;
  attribs?: Record<string, string>;
}): boolean => node.name?.toLowerCase() === 'template' || node.attribs?.hidden !== undefined;

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
 * Textually unwrap CDATA sections, leaving their payload as markup.
 *
 * For `extract_article` only. That stage reasons about the document with selectors, and a
 * selector cannot see inside a CDATA node, so a `<script>` bundle carried in CDATA was
 * invisible to chrome removal while still counting as visible text during scoring. A teaser
 * whose CDATA held a large bundle therefore outscored the real report, won selection, and
 * then collapsed to almost nothing once `stripHtml` expanded the CDATA and dropped the
 * script. Unwrapping before the parse turns the payload into real elements, so chrome
 * removal and scoring both see what the downstream stage will see.
 *
 * Single pass, so a run of unterminated openers costs no more than the input length.
 */
export const unwrapCdata = (html: string): string => {
  const lower = asciiLower(html);
  const pieces: string[] = [];
  let copiedTo = 0;
  let cursor = 0;

  while (cursor < html.length) {
    const open = lower.indexOf('<![cdata[', cursor);

    if (open === -1) {
      cursor = html.length;
    } else {
      pieces.push(html.slice(copiedTo, open));
      const close = lower.indexOf(']]>', open + 9);
      if (close === -1) {
        copiedTo = open + 9;
        cursor = html.length;
      } else {
        pieces.push(html.slice(open + 9, close));
        copiedTo = close + 3;
        cursor = close + 3;
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

/**
 * A closing tag alone is not enough to justify re-parsing, because escaped markup is
 * also how a report *displays* markup on purpose.
 *
 * `<code>&lt;script&gt;fetch('https://c2.evil.test')&lt;/script&gt;</code>` decodes to
 * text carrying a complete escaped snippet. Re-parsing that read it as a live script
 * element and deleted it, losing the IOC the report was published to communicate. A
 * whole encoded document and an escaped snippet are indistinguishable once decoded, so
 * the decision has to be made from the input instead.
 *
 * The signal is whether the input brought any markup of its own. An entity-encoded
 * document parses to a single text node and nothing else, so a re-parse is the only way
 * to reach its content. Anything with real elements is an already-parsed document, and
 * escaped markup inside it is content the author chose to show.
 *
 * Checked at the top level only, which is where the distinction lives and costs nothing.
 * The trade-off is a mixed document, real markup plus an encoded document inside it,
 * which keeps its encoded tags visible in `body_text`. That is the safe direction: noise
 * the section miner mostly absorbs, against silently deleting indicators.
 */
/**
 * Feed container elements, which wrap an encoded document without being part of one.
 *
 * A feed is not a document, so its containers are transparent: `<description>` around an
 * entity-encoded body is packaging, where a `<code>` around escaped markup is content.
 * Without peeling them, the wrapper itself satisfied `carriesOwnMarkup` and suppressed the
 * re-parse for every feed that ships its body encoded rather than in CDATA, leaving the
 * decoded `<script>` and its URL in `body_text` for extraction to mine as a false IOC.
 *
 * Matched on the local name, so namespaced spellings (`content:encoded`,
 * `media:description`, `dc:description`) resolve without listing each prefix. `summary` and
 * `title` are HTML element names too, but they only peel as the sole top-level element,
 * which a real HTML document never presents.
 */
/**
 * Wrappers recognized by their bare, unprefixed name.
 *
 * RSS 2.0 `<description>` only. A namespaced `description` is a different contract and is
 * handled below, because `media:description type="plain"` is plain text by declaration and
 * `dc:description` is literal text by convention, yet both matched here on local name and had
 * their sentences truncated at the first escaped `<script>` token.
 */
const ENCODED_HTML_WRAPPER_BARE_NAMES = new Set(['description']);

/**
 * Wrappers that only qualify with their namespace prefix.
 *
 * `content:encoded` is RSS. Matching it by local name meant any unnamespaced `<encoded>`
 * element, a perfectly ordinary custom or XML name, had its literal text reparsed as live
 * HTML, so `<encoded>Exploit uses &lt;script&gt; and c2.evil.test</encoded>` lost everything
 * from the script token onward. Same false-positive class as the speculative `value` entry,
 * reached through the namespaced name instead of a bare one.
 */
const CONTENT_MODULE_NS = 'http://purl.org/rss/1.0/modules/content/';

/**
 * Resolved `xmlns:` bindings, memoized per node.
 *
 * Walking the ancestor chain independently for each element is quadratic in nesting depth, and
 * these elements are attacker-controlled with no nesting limit: `'<ti:encoded>'.repeat(n)` with
 * the declaration at the root made the deepest lookup inspect n ancestors, the next n-1, and so
 * on. Measured 2ms at depth 500 rising to 38ms at 4,000, which extrapolates to minutes at the
 * byte cap. Memoizing every node visited on the way up means each edge is resolved once, so the
 * whole document costs one pass. A `WeakMap` because the nodes live only as long as the parse.
 */
const namespaceCache = new WeakMap<object, Map<string, string | null>>();

const resolveNamespace = (node: ParsedNode, prefix: string): string | undefined => {
  const unresolved: ParsedNode[] = [];
  let current: ParsedNode | null | undefined = node;
  let found: string | null = null;

  while (current) {
    const cached = namespaceCache.get(current);
    if (cached?.has(prefix)) {
      found = cached.get(prefix) ?? null;
      break;
    }

    const bound = current.attribs?.[`xmlns:${prefix}`];
    if (bound !== undefined) {
      found = bound.trim();
      break;
    }

    unresolved.push(current);
    current = current.parent;
  }

  for (const visited of unresolved) {
    let bindings = namespaceCache.get(visited);
    if (!bindings) {
      bindings = new Map();
      namespaceCache.set(visited, bindings);
    }
    bindings.set(prefix, found);
  }

  return found ?? undefined;
};

/**
 * Whether this element is the RSS Content Module's `encoded`, resolved by namespace.
 *
 * XML prefixes are aliases, so a feed binding the module to `ti:` writes `ti:encoded` and means
 * exactly `content:encoded`. Matching the conventional QName alone left those feeds' encoded
 * script bodies as visible report text.
 *
 * Prefix presence alone was the first attempt and it was too loose: an `encoded` element in an
 * unrelated namespace, `<foo:encoded xmlns:foo="urn:literal">`, had its literal text reparsed as
 * live markup and lost the sentence after the escaped script token. The in-scope `xmlns:` binding
 * is resolved from the ancestor chain instead.
 *
 * The conventional `content:` prefix is accepted without a declaration, because feed bodies reach
 * this code as fragments whose root element, and with it the declaration, is often gone.
 */
const isContentModuleEncoded = (node: ParsedNode, qualified: string): boolean => {
  const colon = qualified.indexOf(':');
  if (colon <= 0 || qualified.slice(colon + 1) !== 'encoded') return false;

  const prefix = qualified.slice(0, colon);
  const bound = resolveNamespace(node, prefix);

  // A declared binding is authoritative, including when it contradicts the conventional prefix:
  // `<content:encoded xmlns:content="urn:literal">` is not the module, and the hard-coded fast
  // path for that QName was returning true before this helper could look. The undeclared
  // conventional prefix stays a fallback, because feed bodies reach this code as fragments whose
  // root declaration is usually gone.
  return bound === undefined ? prefix === 'content' : bound === CONTENT_MODULE_NS;
};

/**
 * Feed containers that are descended through but never treated as an encoded body.
 *
 * These were in the same set as `description` and it cost report content. Every name in the
 * old set expanded its payload when that payload was text-only, so a sentence mentioning
 * markup inside any of them was reparsed as live HTML and the unterminated script subtree
 * swallowed the rest: `<item>Exploit uses &lt;script&gt; and c2.evil.test</item>` came out as
 * `Exploit uses`, losing the indicator. RSS and Atom define no HTML content for `item`,
 * `entry`, `channel`, `feed` or `rss`, so they are structure to walk through and nothing more.
 *
 * `value` is gone entirely rather than moved. It is a generic XML and custom-element name
 * with no basis in either format, and I had added it speculatively, so it was deleting text
 * from any document that happened to use it.
 */
const STRUCTURAL_FEED_CONTAINERS = new Set(['item', 'entry', 'channel', 'feed', 'rss']);

/**
 * Atom text constructs, which declare their own content type.
 *
 * RFC 4287 gives `title`, `summary`, `content`, `rights` and `subtitle` a `type` attribute
 * of `text`, `html` or `xhtml`, defaulting to `text`. Only `html` means the content is
 * entity-encoded markup. Treating these as wrappers on name alone reparsed literal text as
 * live markup and deleted report content:
 * `<summary type="text">Exploit uses &lt;script&gt; and c2.evil.test</summary>` came out as
 * `Exploit uses`, losing the sentence and the indicator in it.
 *
 * `xhtml` is excluded along with `text`, since its content is real markup rather than
 * encoded markup and needs no second parse. RSS `<description>` and `content:encoded` carry
 * no type attribute and are encoded HTML by convention, so they stay unconditional above.
 *
 * The structural containers are deliberately not here and not in the encoded set: they are
 * walked through, never expanded.
 */
const ATOM_TEXT_CONSTRUCTS = new Set(['title', 'summary', 'content', 'rights', 'subtitle']);

/**
 * An Atom text construct declaring content that is NOT encoded markup.
 *
 * Its payload is literal, so it is emitted as text rather than walked. The type handling
 * added for entity-encoded payloads was bypassed by the CDATA branch, which always reparsed:
 * `<summary type="text"><![CDATA[Exploit uses <script> and c2.evil.test]]></summary>` had the
 * `<script>` read as an unterminated raw-text element and lost the rest of the sentence and
 * the indicator, while the entity spelling of the same content was preserved. Two spellings
 * of one thing behaving differently is the bug.
 */
const isLiteralTextConstruct = (node: ParsedNode): boolean => {
  if (!isElement(node) || !ATOM_TEXT_CONSTRUCTS.has(localName(elementName(node)))) return false;

  // An Atom text construct holds character data and nothing else, so an element child means
  // this is the HTML element of the same name rather than the Atom one. `summary` is both, and
  // taking the literal branch for `<details><summary><script>…</script>Visible</summary>` put
  // the script body and its URL into `body_text`, because that branch emits raw text and does
  // not apply subtree filtering. Element children now fall through to the normal walk, where
  // `script` is skipped.
  if (childrenOf(node).some(isElement)) return false;
  // Only a text-valued construct is literal. `xhtml` content is inline markup and has to be
  // walked: taking the literal branch merged its block boundaries and emitted its script
  // bodies, so `<summary type="xhtml"><div><p>a</p><p>b</p><script>…</script></div></summary>`
  // produced `ab` joined together with the script text appended.
  // Literal unless the construct declares markup. Enumerating the literal types instead meant
  // every spelling not on the list went to the HTML parser, which is the destructive direction:
  // `<content type="text/plain">` and `<summary type="text/plain">` carrying CDATA had their
  // literal `<script>` read as an unterminated element and lost the rest of the sentence and the
  // indicator, while the entity spelling of the same content was preserved. Defaulting to
  // literal makes an unrecognized or invalid type preserve content rather than delete it.
  return !isEncodedHtmlWrapper(node) && !isInlineXmlConstruct(node);
};

/** An element whose text payload is an entity-encoded HTML document. */
/** Declared type of an Atom text construct, without media-type parameters. */
const atomType = (node: ParsedNode): string =>
  (node.attribs?.type ?? '').split(';', 1)[0].trim().toLowerCase();

const isEncodedHtmlWrapper = (node: ParsedNode): boolean => {
  const qualified = elementName(node);
  const name = localName(qualified);
  if (isContentModuleEncoded(node, qualified)) return true;
  if (ENCODED_HTML_WRAPPER_BARE_NAMES.has(qualified)) return true;

  // A namespaced description has to declare HTML, mirroring the Atom rule below. Media RSS
  // spells the plain case `type="plain"`, and Dublin Core carries no type at all, so neither
  // qualifies without saying so.
  if (ENCODED_HTML_WRAPPER_BARE_NAMES.has(name)) return atomType(node) === 'html';

  if (!ATOM_TEXT_CONSTRUCTS.has(name)) return false;

  const type = atomType(node);
  if (type === 'html') return true;

  // Only `atom:content` accepts a media type. RFC 4287 limits the other text constructs to
  // the `text`/`html`/`xhtml` shorthand, and `content` additionally permits any MIME type,
  // of which `text/html` is the encoded-markup one. An XML media type or anything ending in
  // `+xml` is inline markup rather than encoded markup, so it is excluded for the same reason
  // the `xhtml` shorthand is.
  return name === 'content' && type === 'text/html';
};

const localName = (name: string): string => name.slice(name.lastIndexOf(':') + 1);

/**
 * Strip transparent feed wrappers so eligibility is judged on the payload.
 *
 * Only peels a wrapper that is the sole meaningful child, so a wrapper sitting alongside
 * real content is left in place. Depth-bounded because the loop is driven by input shape.
 */
const peelFeedWrappers = (nodes: ParsedNode[]): ParsedNode[] => {
  let current = nodes;

  for (let depth = 0; depth < 8; depth++) {
    // Comments and directives are not content, and excluding them matters for the common
    // case rather than an exotic one: every RSS document opens with `<?xml version="1.0"?>`,
    // which counted as a second top-level node and stopped the wrapper from ever peeling,
    // leaving the encoded body's tags in `body_text`.
    const meaningful = current.filter((node) => {
      if (node.type === 'comment' || node.type === 'directive') return false;
      return node.type !== 'text' || (node.data ?? '').trim() !== '';
    });
    const [only] = meaningful;
    const isWrapper =
      meaningful.length === 1 &&
      only !== undefined &&
      isElement(only) &&
      (isEncodedHtmlWrapper(only) || STRUCTURAL_FEED_CONTAINERS.has(localName(elementName(only))));

    if (!isWrapper || only === undefined) return current;
    current = childrenOf(only);
  }

  return current;
};

const payloadCarriesMarkup = (payload: ParsedNode[]): boolean =>
  payload.some((node) => isElement(node) || node.type === 'cdata');

/**
 * Whether a decoded result should be parsed a second time.
 *
 * One gate rather than the two that had drifted apart in `stripHtml` and
 * `htmlToStructured`. Two conditions, and the second is what makes a wrapper worth
 * detecting:
 *
 * Markup of its own disqualifies the input, because escaped markup inside a real document
 * is content the author chose to display and re-parsing it deleted the indicator the report
 * was published to communicate.
 *
 * Otherwise a residual closing tag is the signal, *or* the payload arrived inside a
 * transparent feed wrapper. A closing tag alone missed valid encoded bodies that have none:
 * void elements never close, so
 * `<description>evil.com&lt;br/&gt;bad.net&lt;img src="…"&gt;</description>` kept both tags
 * and the image URL in `body_text`, where the URL is not visible text and became a false
 * indicator. A body truncated by the parse cap before its close tag failed the same way. The
 * wrapper is enough context on its own: a `<description>` whose only child is text is that
 * feed's encoded body, closing tag or not.
 *
 * A bare payload with no wrapper still needs the closing tag, which is what keeps prose
 * discussing `use &lt;br/&gt; carefully` from being reparsed and eaten.
 */
const shouldReparse = (nodes: ParsedNode[], decoded: string, inWrapper = false): boolean => {
  const payload = peelFeedWrappers(nodes);
  if (payloadCarriesMarkup(payload)) return false;

  // A wrapper disqualifies the input rather than qualifying it, which is the reverse of what
  // this gate used to do. Wrapped encoded bodies are expanded per element during the walk, so
  // by the time we get here that work is done and `decoded` is the expanded output. Running it
  // through a second parse deleted markup the report displayed on purpose: a `<description>`
  // holding an escaped `<code>` snippet came out empty, while the identical snippet at top
  // level was preserved. Structural containers are peeled here too, and they are also handled
  // by the walk, so the same reasoning covers them.
  if (payload !== nodes) return false;

  // Bare input only. No wrapper said what this is, so a closing tag in the decoded text is
  // the signal, and that is what keeps prose discussing markup from being reparsed and eaten.
  return inWrapper || RESIDUAL_CLOSING_TAG.test(decoded);
};

/** Stack entry: a node still to visit, or literal output to append after its subtree. */
type WalkStep =
  | { kind: 'node'; node: ParsedNode; cdataDepth: number; literalCdata: boolean; inFeed: boolean }
  | { kind: 'emit'; text: string }
  // Restores section state after a report container's subtree. Only the structured renderer
  // produces these, because only it carries section state.
  | { kind: 'section'; sectionKind: SectionKind; sectionDepth: number };

/** Feed document roots. Their descendants are report containers; elsewhere the names are not. */
const FEED_ROOT_NAMES = new Set(['rss', 'feed']);

/**
 * How many times a CDATA payload may be expanded into the walk.
 *
 * CDATA cannot legally nest, so real feeds need one. The bound exists because malformed
 * input can look like it nests: `'<![CDATA['.repeat(n)` parses as one unterminated node per
 * pass, and expanding each one re-parsed the remaining text. Measured before the bound at
 * 10ms for n=200, 740ms for n=2,000, and a hard `RangeError` at n=20,000.
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
 * The walks in this file are iterative rather than recursive on purpose. Feed HTML is
 * attacker-controlled and the parser imposes no nesting limit, so `'<div>'.repeat(n)`
 * builds an arbitrarily deep tree; a recursive walk would exhaust the call stack and
 * take the task worker down with it.
 */
const pushNodes = (
  stack: WalkStep[],
  nodes: ParsedNode[],
  cdataDepth = 0,
  literalCdata = false,
  inFeed = false
): void => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    stack.push({ kind: 'node', node: nodes[i], cdataDepth, literalCdata, inFeed });
  }
};

/**
 * An Atom construct whose content is inline XML markup.
 *
 * Walked like any element subtree, but its CDATA children are character data by definition
 * in XML, so they are not parsed as HTML. Parsing them read a `<script>` inside the payload
 * as a real raw-text element and lost the rest of the sentence with it.
 */
const isInlineXmlConstruct = (node: ParsedNode): boolean => {
  if (!isElement(node) || !ATOM_TEXT_CONSTRUCTS.has(localName(elementName(node)))) return false;
  const type = atomType(node);
  // The shorthand plus the media-type spellings RFC 4287 treats as inline XML.
  return (
    type === 'xhtml' || type.endsWith('+xml') || type === 'text/xml' || type === 'application/xml'
  );
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
/**
 * Concatenated text of a subtree, ignoring element structure.
 *
 * Used for CDATA, whose payload the parser hands back as opaque text rather than as a
 * parsed subtree.
 */
/**
 * An encoded-HTML wrapper carrying nothing but text, which is a payload to re-parse.
 *
 * Handled per element during the walk rather than by peeling the whole document, because
 * requiring the wrapper to be the sole meaningful child at every level meant no realistic
 * feed qualified. `<channel>` has a `<title>` beside its `<item>`, an Atom `<entry>` has a
 * title and a link beside its summary, and a feed has more than one item, so peeling stopped
 * at the first level with siblings and the encoded body kept its markup in `body_text`. The
 * only shape that worked was the single-child chain my own test happened to use.
 *
 * Requiring text-only children is what keeps this from firing on the structural containers
 * that share the wrapper name list: `<item>` and `<channel>` hold elements, so they are
 * walked normally.
 */
const isTextOnlyEncodedWrapper = (node: ParsedNode): boolean => {
  if (!isElement(node) || !isEncodedHtmlWrapper(node)) return false;

  // Comments and directives are packaging, not payload, and `rawTextOf` already contributes
  // nothing for them. Counting them as content meant a feed writing
  // `<description><!-- generated -->…</description>` failed the text-only check, so its
  // encoded body was never expanded and the script URL inside it stayed in `body_text`. This
  // is the same exclusion `peelFeedWrappers` makes, which I applied there and not here.
  const children = childrenOf(node).filter(
    (child) => child.type !== 'comment' && child.type !== 'directive'
  );

  return (
    children.length > 0 &&
    children.every((child) => child.type === 'text') &&
    rawTextOf(children).trim() !== ''
  );
};

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
 * CDATA content is literal, so a feed that entity-encoded its body *and* wrapped it in
 * CDATA arrives with the markup still encoded after one parse. That left
 * `<![CDATA[&lt;script&gt;fetch("…")&lt;/script&gt;safe]]>` yielding the script body and its
 * URL as visible text for extraction to mine. Same decision `stripHtml` makes on its own
 * input, applied to the payload, and bounded to one extra parse.
 */
const parseCdataPayload = (raw: string): ParsedNode[] => {
  const nodes = parseTopLevelNodes(raw);
  const payload = peelFeedWrappers(nodes);

  // Checked before anything decodes the payload. `inlineTextOf` walks CDATA nodes by calling
  // back into this function, so computing the decoded text first turned the pair into
  // unbounded mutual recursion: the walker's depth bound lives on its stack and does not
  // reach this path. `'<![CDATA['.repeat(1000)` hung outright.
  if (payloadCarriesMarkup(payload)) return nodes;

  // No closing tag required, because the CDATA section is itself the context: its payload is
  // the feed's body whether or not that body happens to contain one.
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
    } else if (step.kind === 'section') {
      // Never produced by this walker; it carries no section state.
    } else {
      const { node, cdataDepth, literalCdata, inFeed } = step;
      const liftedHref =
        isElement(node) && liftHrefs && elementName(node) === 'a' ? hrefOf(node) : undefined;

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (node.type === 'cdata' && literalCdata) {
        out.push(` ${rawTextOf(childrenOf(node))} `);
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
          pushNodes(
            stack,
            parseCdataPayload(rawTextOf(childrenOf(node))),
            cdataDepth + 1,
            literalCdata
          );
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
      } else if (isInlineXmlConstruct(node)) {
        pushNodes(stack, childrenOf(node), cdataDepth, true, inFeed);
      } else if (isLiteralTextConstruct(node)) {
        // Atom says this payload is text, so it is emitted rather than walked.
        //
        // Markers unwrapped rather than left in place, because HTML treats `<title>` as an
        // escapable raw-text element and so hands back `<![CDATA[ … ]]>` as literal
        // characters, where `<summary>` gets a parsed CDATA node. Without this, one Atom text
        // construct showed the markers and the other did not, for the same input.
        out.push(` ${unwrapCdata(rawTextOf(childrenOf(node)))} `);
      } else if (isTextOnlyEncodedWrapper(node)) {
        // A feed wrapper whose payload is text is that feed's encoded body, wherever it sits
        // in the document. Parsed into this walk, bounded by the same depth counter CDATA
        // uses, so a wrapper nested in a wrapper cannot spin.
        //
        // Past the bound the payload is dropped rather than falling through to the generic
        // walker, which would emit the still-encoded markup as visible text. The CDATA branch
        // already dropped at its limit; this one had no over-limit case at all, so the bound
        // narrowed the branch instead of bounding it.
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(
            stack,
            parseTopLevelNodes(rawTextOf(childrenOf(node))),
            cdataDepth + 1,
            literalCdata,
            inFeed
          );
        }
      } else if (liftedHref !== undefined) {
        out.push(` ${collapseWhitespace(inlineTextOf(childrenOf(node), false))} ${liftedHref} `);
      } else if (INLINE_NAMES.has(elementName(node))) {
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
      } else {
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
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
    } else if (step.kind === 'section') {
      sectionKind = step.sectionKind;
      sectionDepth = step.sectionDepth;
    } else {
      const { node, cdataDepth, literalCdata, inFeed } = step;
      const name = elementName(node);
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = sectionKind === 'ioc' || sectionKind === 'references';

      if (node.type === 'text') {
        out.push(node.data ?? '');
      } else if (node.type === 'cdata' && literalCdata) {
        out.push(`\n${rawTextOf(childrenOf(node))}\n`);
      } else if (node.type === 'cdata') {
        // Same as the plain-text walker, and parsed into this walk for the same reasons.
        // Re-entering `renderStructured` also started a fresh walk whose section state was
        // `prose`, so CDATA sitting under an `<h2>Indicators of Compromise</h2>` was
        // rendered as prose and every href-only indicator inside it was dropped. Section
        // state is walker-local, so feeding the nodes into this stack inherits it.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(
            stack,
            parseCdataPayload(rawTextOf(childrenOf(node))),
            cdataDepth + 1,
            literalCdata
          );
        }
      } else if (!isElement(node)) {
        // Comments and doctype contribute a boundary only.
        out.push(' ');
      } else if (isSkippedSubtree(node)) {
        out.push(' ');
      } else if (FEED_ROOT_NAMES.has(localName(name))) {
        // Entering a feed document. Everything below is report containers, which is the only
        // context where the container names mean what they say.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, true);
      } else if (inFeed && STRUCTURAL_FEED_CONTAINERS.has(localName(name))) {
        // Restored on the way out as well as reset on the way in. Resetting only on entry left a
        // heading from inside the container active for whatever followed it, so an item ending in
        // `<h2>IOCs</h2>` lifted the href in the channel-level `<description>` after it and
        // published ordinary feed metadata as an indicator. `inFeed` travels on the frame, but
        // section state is renderer-global, so leaving a container needs an explicit event.
        stack.push({ kind: 'section', sectionKind, sectionDepth });
        // Section state resets at a report boundary. It is walker-local, which is what lets a
        // wrapper payload inherit it, but one walk covers a whole feed document, so an `IOCs`
        // heading in one item left href lifting on for every later item and an ordinary citation
        // anchor in the next entry was emitted as an indicator.
        //
        // Gated on feed context, because resetting on the name alone broke ordinary vendor
        // markup: `<h2>IOCs</h2><item>domain values</item><p><a href="…">indicator</a></p>` reset
        // to prose at a plain `<item>` and dropped the href that was still under the heading.
        sectionKind = 'prose';
        sectionDepth = 0;
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
      } else if (isInlineXmlConstruct(node)) {
        pushNodes(stack, childrenOf(node), cdataDepth, true, inFeed);
      } else if (isLiteralTextConstruct(node)) {
        // Same as the plain-text walker.
        out.push(`\n${unwrapCdata(rawTextOf(childrenOf(node)))}\n`);
      } else if (isTextOnlyEncodedWrapper(node)) {
        // Same as the plain-text walker, including dropping past the depth bound rather than
        // letting a still-encoded payload through as visible text.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        if (cdataDepth < MAX_CDATA_DEPTH) {
          pushNodes(
            stack,
            parseTopLevelNodes(rawTextOf(childrenOf(node))),
            cdataDepth + 1,
            literalCdata,
            inFeed
          );
        }
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
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
      } else if (INLINE_NAMES.has(name)) {
        // Inline element: no boundary, contents kept.
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
      } else {
        // Unknown or custom element. Same conservative default as the plain-text
        // walker: treating these as inline merged adjacent indicators, so
        // `<ioc-value>evil.com</ioc-value><ioc-value>bad.net</ioc-value>` came out as
        // `evil.combad.net`. Vendor web components make that common, and it defeats the
        // one thing this structured form exists to preserve.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, literalCdata, inFeed);
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
