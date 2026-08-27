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
 * Elements whose content never reaches a reader. The render-state helper below is shared
 * with `extract_article`, which needs the same rule for candidate exclusion and scoring so
 * a `<template>` or hidden block can't win article selection there either. `iframe` is here
 * for the same reason as `template`: browsers don't render its contents.
 */
const NON_RENDERED_NAMES = new Set(['template', 'iframe']);

/**
 * `display: none` among the element's inline style declarations.
 * Parsed per declaration rather than matched with a regex on the whole string, so a
 * decoy — a custom property (`--display:none`) or another property's value that happens
 * to contain the text (`content: 'display:none'`) — can't false-positive and hide content
 * that is genuinely visible. `visibility: hidden` is deliberately not treated as a hidden
 * subtree: descendants may override it with `visibility: visible`, while nothing below a
 * `display: none` element can render.
 */
interface CssPropertyValue {
  value: string;
  important: boolean;
}

interface InlineStyleState {
  displayHidden: boolean;
  visibility?: 'hidden' | 'visible';
}

const CSS_WIDE_KEYWORDS = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer']);
const INHERITED_CSS_WIDE_KEYWORDS = new Set(['inherit', 'unset']);
const trimCssWhitespace = (input: string): string =>
  input.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');

/** Decodes CSS escapes before comparing property names and keyword values. */
const decodeCssEscapes = (input: string): string => {
  let decoded = '';
  let index = 0;

  while (index < input.length) {
    if (input[index] !== '\\' || index + 1 >= input.length) {
      decoded += input[index];
      index += 1;
    } else if (!/[0-9a-f]/i.test(input[index + 1])) {
      const escaped = input[index + 1];
      // A newline cannot be escaped in an identifier. Keep the backslash so an invalid
      // spelling cannot become a valid hidden-state keyword in this conservative parser.
      if (/\r|\n|\f/.test(escaped)) {
        decoded += '\\';
      } else {
        decoded += escaped;
      }
      index += 2;
    } else {
      let hexEnd = index + 1;
      while (hexEnd < input.length && hexEnd < index + 7 && /[0-9a-f]/i.test(input[hexEnd])) {
        hexEnd += 1;
      }
      const codePoint = Number.parseInt(input.slice(index + 1, hexEnd), 16);
      decoded +=
        codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)
          ? '\uFFFD'
          : String.fromCodePoint(codePoint);
      // A single whitespace character after a hexadecimal escape is its terminator, not part
      // of the value. Treat CRLF as that one terminator too.
      if (/[ \t\r\n\f]/.test(input[hexEnd] ?? '')) {
        if (input[hexEnd] === '\r' && input[hexEnd + 1] === '\n') {
          hexEnd += 1;
        }
        hexEnd += 1;
      }
      index = hexEnd;
    }
  }

  return decoded;
};

const hasEscapedCharacterAt = (input: string, index: number): boolean => {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && input[cursor] === '\\'; cursor--) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

const cssPropertyValue = (rawValue: string): CssPropertyValue => {
  const trimmed = trimCssWhitespace(rawValue);
  for (let index = trimmed.length - 1; index >= 0; index--) {
    if (trimmed[index] === '!' && !hasEscapedCharacterAt(trimmed, index)) {
      const priority = decodeCssEscapes(trimCssWhitespace(trimmed.slice(index + 1))).toLowerCase();
      if (priority === 'important') {
        return {
          value: decodeCssEscapes(trimCssWhitespace(trimmed.slice(0, index))).toLowerCase(),
          important: true,
        };
      }
      // Only the final unescaped priority delimiter can make the declaration important.
      // Anything after an earlier one invalidates that suffix, so retrying at every `!`
      // would be both incorrect and quadratic on attacker-controlled style text.
      break;
    }
  }
  return { value: decodeCssEscapes(trimmed).toLowerCase(), important: false };
};

/** Splits an inline style at declaration boundaries, not semicolons inside CSS values. */
const splitCssDeclarations = (style: string): string[] => {
  const declarations: string[] = [];
  const current: string[] = [];
  const blockClosers: string[] = [];
  let quote = '';
  let index = 0;

  while (index < style.length) {
    const char = style[index];
    const next = style[index + 1];

    if (quote !== '') {
      current.push(char);
      if (char === '\\' && next !== undefined) {
        current.push(next);
        index += 1;
      } else if (char === quote) quote = '';
    } else if (char === '/' && next === '*') {
      const commentEnd = style.indexOf('*/', index + 2);
      if (commentEnd === -1) break;
      index = commentEnd + 1;
    } else if (char === '"' || char === "'") {
      quote = char;
      current.push(char);
    } else if (char === '\\' && next !== undefined) {
      current.push(char, next);
      index += 1;
    } else if (char === '(' || char === '[' || char === '{') {
      blockClosers.push(char === '(' ? ')' : char === '[' ? ']' : '}');
      current.push(char);
    } else if (char === blockClosers[blockClosers.length - 1]) {
      blockClosers.pop();
      current.push(char);
    } else if (char === ';' && blockClosers.length === 0) {
      declarations.push(current.join(''));
      current.length = 0;
    } else {
      current.push(char);
    }

    index += 1;
  }

  declarations.push(current.join(''));
  return declarations;
};

const inlineStyleState = (style: string | undefined): InlineStyleState => {
  if (!style) return { displayHidden: false };

  let display: CssPropertyValue | undefined;
  let visibility: CssPropertyValue | undefined;
  const setProperty = (property: 'display' | 'visibility', value: CssPropertyValue): void => {
    const current = property === 'display' ? display : visibility;
    // Inline declarations have equal specificity: the last one wins, except that an
    // important declaration cannot be overridden by a later non-important declaration.
    if (!current?.important || value.important) {
      if (property === 'display') display = value;
      else visibility = value;
    }
  };

  for (const declaration of splitCssDeclarations(style)) {
    const colon = declaration.indexOf(':');
    if (colon !== -1) {
      const property = decodeCssEscapes(
        trimCssWhitespace(declaration.slice(0, colon))
      ).toLowerCase();
      if (property === 'display' || property === 'visibility' || property === 'all') {
        const { value, important } = cssPropertyValue(declaration.slice(colon + 1));
        if (property === 'all') {
          if (CSS_WIDE_KEYWORDS.has(value)) {
            setProperty('display', { value: '', important });
            // `visibility` is inherited. `initial` restores `visible`; inherit/unset keep
            // the parent's value. Revert depends on stylesheets this parser cannot see, so
            // visible is the conservative result for a false-strip-sensitive extractor.
            const resetVisibility = INHERITED_CSS_WIDE_KEYWORDS.has(value) ? '' : 'visible';
            setProperty('visibility', { value: resetVisibility, important });
          }
        } else {
          setProperty(property, { value, important });
        }
      }
    }
  }

  let resolvedVisibility: InlineStyleState['visibility'];
  if (visibility?.value === 'hidden' || visibility?.value === 'collapse') {
    resolvedVisibility = 'hidden';
  } else if (
    visibility?.value === 'visible' ||
    visibility?.value === 'initial' ||
    visibility?.value === 'revert' ||
    visibility?.value === 'revert-layer'
  ) {
    resolvedVisibility = 'visible';
  }

  return { displayHidden: display?.value === 'none', visibility: resolvedVisibility };
};

interface ElementRenderState {
  subtreeHidden: boolean;
  visible: boolean;
}

export const elementRenderState = (
  node: {
    name?: string;
    attribs?: Record<string, string>;
  },
  parentVisible: boolean
): ElementRenderState => {
  const { displayHidden, visibility } = inlineStyleState(node.attribs?.style);
  const subtreeHidden =
    NON_RENDERED_NAMES.has(node.name?.toLowerCase() ?? '') ||
    node.attribs?.hidden !== undefined ||
    displayHidden;
  const visible = visibility === 'hidden' ? false : visibility === 'visible' || parentVisible;
  return { subtreeHidden, visible };
};

const isAlwaysSkippedSubtree = (node: ParsedNode): boolean =>
  SKIPPED_SUBTREE_NAMES.has(elementName(node));

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
interface RawTextNormalization {
  html: string;
  hasUnclosedRawText: boolean;
}

const normalizeRawText = (html: string): RawTextNormalization => {
  const lower = asciiLower(html);
  const pieces: string[] = [];
  let copiedTo = 0;
  let cursor = 0;
  let hasUnclosedRawText = false;

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
          hasUnclosedRawText = true;
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
            hasUnclosedRawText = true;
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
              hasUnclosedRawText = true;
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

  if (copiedTo === 0) return { html, hasUnclosedRawText };
  pieces.push(html.slice(copiedTo));
  return { html: pieces.join(''), hasUnclosedRawText };
};

export const normalizeSelfClosedRawText = (html: string): string => normalizeRawText(html).html;

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
 * Whether `raw` contains a `<script>`/`<style>` opener with no matching close anywhere in
 * the payload (self-closed forms normalized first, so `<script/>` doesn't count). CDATA is
 * literal, unescaped text, so an opener like this parses as a real raw-text element that
 * swallows the rest of the payload as its body — `payloadCarriesMarkup` alone can't tell
 * that apart from genuine markup, and once parsed that way the swallowed text is
 * unrecoverable, since a skipped subtree never contributes to the walk. Checked on the raw
 * string, before parsing, for the same reason `shouldReparse` decides from text rather than
 * from a parse it doesn't yet trust.
 */
const hasUnclosedRawTextOpener = (raw: string): boolean => {
  return normalizeRawText(raw).hasUnclosedRawText;
};

/**
 * Parses a CDATA payload into nodes. RSS and Atom carry an entire HTML document inside
 * `<![CDATA[ ... ]]>`, so it has to be parsed or the article body is lost. CDATA content
 * is also literal, so a document that entity-encoded its body *and* wrapped it in CDATA
 * arrives still encoded after one parse — the same `shouldReparse` decision, applied here
 * to the payload and bounded to one extra parse.
 */
const parseCdataPayload = (raw: string): ParsedNode[] => {
  if (hasUnclosedRawTextOpener(raw)) return [{ type: 'text', data: raw }];
  const nodes = parseTopLevelNodes(raw);
  if (payloadCarriesMarkup(nodes)) return nodes;
  const decoded = inlineTextOf(nodes, false);
  if (hasUnclosedRawTextOpener(decoded)) return [{ type: 'text', data: decoded }];
  return parseTopLevelNodes(decoded);
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
      const renderState = isElement(node)
        ? elementRenderState(node, parentVisible)
        : { subtreeHidden: false, visible: parentVisible };
      const { visible } = renderState;
      const liftedHref =
        isElement(node) && visible && liftHrefs && elementName(node) === 'a'
          ? hrefOf(node)
          : undefined;

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
      } else if (!visible) {
        // `visibility` may be restored by a descendant, so walk the subtree while keeping
        // boundaries around any visible text it contains.
        out.push(' ');
        stack.push({ kind: 'emit', text: ' ' });
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
      } else if (liftedHref !== undefined) {
        out.push(
          ` ${collapseWhitespace(inlineTextOf(childrenOf(node), false, visible))} ${liftedHref} `
        );
      } else if (INLINE_NAMES.has(elementName(node))) {
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

const renderStructured = (nodes: ParsedNode[]): string => {
  // Section state, advanced in document order as headings are met. A classified heading
  // becomes the anchor for everything below it; a deeper unclassified heading is its
  // subsection and doesn't reset the anchor.
  let sectionKind: SectionKind = 'prose';
  let sectionDepth = 0;

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
      const renderState = isElement(node)
        ? elementRenderState(node, parentVisible)
        : { subtreeHidden: false, visible: parentVisible };
      const { visible } = renderState;
      // Anchors are lifted only under an IOC or references heading, where the link
      // target is itself the indicator.
      const lift = sectionKind === 'ioc' || sectionKind === 'references';

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
      } else if (!visible) {
        // Unlike display:none, visibility can be restored by a descendant. Preserve that
        // text without letting the hidden wrapper affect section state or merge tokens.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
      } else if (HEADING_NAMES.has(name)) {
        const depth = Number(name.slice(1));
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), false, visible));
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
          .flatMap((cell) => {
            const cellRenderState = elementRenderState(cell, visible);
            if (cellRenderState.subtreeHidden) return [];
            return [
              collapseWhitespace(inlineTextOf(childrenOf(cell), lift, cellRenderState.visible)),
            ];
          });
        out.push(cellTexts.length > 0 ? `\n| ${cellTexts.join(' | ')} |\n` : '\n');
      } else if (name === 'li') {
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), lift, visible));
        if (text) out.push(`\n- ${text}\n`);
      } else if (name === 'a') {
        const text = collapseWhitespace(inlineTextOf(childrenOf(node), false, visible));
        const href = lift ? hrefOf(node) : undefined;
        // Prose anchors collapse to visible text only, so ordinary citation links don't
        // flood extraction with reference noise.
        out.push(href !== undefined ? `${text} ${href} ` : `${text} `);
      } else if (name === 'br') {
        out.push('\n');
      } else if (BLOCK_NAMES.has(name)) {
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
      } else if (INLINE_NAMES.has(name)) {
        // Inline element: no boundary, contents kept.
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
      } else {
        // Unknown or custom element: same conservative default as the plain-text walker.
        // Treating these as inline would merge adjacent indicators in vendor web
        // components, which is exactly what this structured form exists to keep separate.
        out.push('\n');
        stack.push({ kind: 'emit', text: '\n' });
        pushNodes(stack, childrenOf(node), cdataDepth, visible);
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
