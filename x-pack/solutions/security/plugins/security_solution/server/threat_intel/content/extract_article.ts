/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import {
  capToParseBytes,
  normalizeSelfClosedRawText,
  PARSER_OPTIONS,
  stripHtml,
  unwrapCdata,
} from './text';

/**
 * Strip known page chrome (nav/header/footer/sidebar) from raw vendor HTML,
 * leaving only the article body.
 *
 * SUBTRACTIVE — we remove explicitly identified chrome, never filter to
 * "article-like" content. The rule: keep everything except unambiguously
 * chrome. A false-keep is noise the section-miner mostly handles; a
 * false-strip could drop an IOC — that is the failure mode we must avoid.
 *
 * Preserved always: <code>, <pre>, <table>, inline spans, <a>.
 * These were the precise elements Readability dropped that caused missed IOCs
 * (the readability-failure case this pre-step must NOT reproduce).
 */

/** Ordered list of container selectors. First match wins. */
const ARTICLE_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.blog-post',
] as const;

/**
 * Chrome element selectors removed from the selected container.
 * Be conservative — only elements that are unambiguously page chrome.
 *
 * `header`, `footer`, and `aside` are deliberately NOT here. HTML permits them inside
 * an article to hold its own introduction, citations, and callouts, so removing every
 * descendant threw away report content: an `<article><header>` commonly carries the
 * executive summary, and IOC callouts live in `<aside>`. They are page chrome only
 * when they sit outside the article, which `PAGE_CHROME_SELECTORS` handles.
 */
const CHROME_SELECTORS = [
  'nav',
  '[role="navigation"]',
  'script',
  'style',
  'noscript',
  'form',
  '.sidebar',
  '.nav',
  '.menu',
  '.related-posts',
  '.share',
  '.newsletter',
  '.comments',
  '#comments',
].join(', ');

/**
 * Select the article container from raw HTML and strip known chrome subtrees.
 *
 * 1. Try ARTICLE_SELECTORS in order — first match is the container.
 * 2. Fall back to <body> if none match (never drop to nothing).
 * 3. Remove CHROME_SELECTORS from within the chosen container.
 * 4. Return the cleaned container HTML.
 */
/**
 * Chrome that is only chrome at page level. Removed from outside the chosen container,
 * never from within it, so an article's own header, footer, or aside survives.
 */
const PAGE_CHROME_SELECTORS = [
  'body > header',
  'body > footer',
  'body > aside',
  // The class-based equivalents, for the same reason as the elements: vendors write
  // `<article><div class="header">Executive summary…</div>` just as often as
  // `<article><header>`, so removing every descendant match deleted report content and
  // skewed candidate scoring with it.
  'body > .header',
  'body > .footer',
].join(', ');

/**
 * Text of `root`, skipping any subtree in `excluded`.
 *
 * Replaces `$(el).clone()` + `.find(CHROME).remove()` + `.text()`. `clone()` bottoms out
 * in domhandler's `cloneNode`, which recurses once per level of nesting and throws
 * `RangeError: Maximum call stack size exceeded` at around 1,600 nested elements — under
 * 10KB of input, well inside `MAX_PARSE_BYTES`, on markup this function exists to handle.
 * Worse, the exact threshold moves with how much stack the caller already used, so it
 * presents as an intermittent crash rather than a reproducible one.
 *
 * Measuring in place removes the clone entirely: nothing is copied and nothing is
 * mutated, so scoring cannot disturb the tree that is ultimately serialized.
 */
interface ParsedNode {
  type: string;
  data?: string;
  children?: ParsedNode[];
}

/**
 * htmlparser2 rather than cheerio's default parse5, matching `text.ts`.
 *
 * parse5's HTML5 tree construction is quadratic in nesting depth, and this entry point
 * pays that cost on up to 10MB of attacker-influenced input: measured through this
 * function, 112ms at 5,000 nested elements, 433ms at 10,000, and 2.2s at 20,000. Bounding
 * the output could not have helped, because the cost is in the parse itself.
 */

/**
 * Nesting depth past which the page is not simplified at all.
 *
 * cheerio's selector engine is quadratic in depth independently of the parser (653ms to
 * evaluate one selector list against 50,000 nested elements), and unlike the parser it
 * cannot simply be swapped: `ARTICLE_SELECTORS` and `CHROME_SELECTORS` carry class, id,
 * attribute, and child-combinator forms whose semantics are worth more than
 * reimplementing them by hand for a heuristic pre-step.
 *
 * So the selectors are kept and the input they run against is bounded instead. Real
 * article pages nest a few dozen elements deep; 256 is far above anything legitimate and
 * far below where the quadratic term costs anything. Past it the page is returned
 * unsimplified, which is the same degradation this function already applies elsewhere:
 * chrome is noise the section miner mostly handles, whereas spending a task worker on one
 * hostile page costs every other report in the queue.
 */
const MAX_NESTING_DEPTH = 256;

/**
 * Bounds on scoring candidates with the real downstream text function.
 *
 * Precise scoring costs one `stripHtml` per candidate, so it is used only where that is
 * cheap. Real article pages have a handful of article-like containers and are well under a
 * megabyte; past either bound the linear DOM count is used instead.
 */
const PRECISE_SCORE_MAX_CANDIDATES = 32;
const PRECISE_SCORE_MAX_BYTES = 2 * 1024 * 1024;

const maxDepthOf = (roots: ParsedNode[]): number => {
  let max = 0;
  const stack: Array<{ node: ParsedNode; depth: number }> = roots.map((node) => ({
    node,
    depth: 1,
  }));

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.depth > max) max = frame.depth;
    // No early exit on the bound: the walk is linear and the caller wants the real depth
    // for its own decision, so stopping early would only trade clarity for nothing.
    for (const child of frame.node.children ?? []) {
      stack.push({ node: child, depth: frame.depth + 1 });
    }
  }

  return max;
};

/**
 * Visible-character count of every node's subtree in one pass.
 *
 * Scoring each candidate with its own subtree traversal was quadratic whenever candidates
 * nest, and `ARTICLE_SELECTORS` nest readily: `'<article>'.repeat(n)` produces n
 * candidates whose subtrees all overlap. Measured through this function, 16ms at n=200
 * rising to 770ms at n=1,600, from 14KB of input.
 *
 * Computing bottom-up makes every candidate a map lookup instead. Chrome needs no special
 * case here, because it has already been removed from the document above.
 *
 * Counts non-whitespace characters rather than trimming: the previous `.text().trim()`
 * could not be expressed as a sum over subtrees, and the only thing the score is used for
 * is comparing candidates and rejecting empty ones. Both survive the change.
 */
const visibleLengths = (roots: ParsedNode[]): Map<ParsedNode, number> => {
  const lengths = new Map<ParsedNode, number>();
  const stack: Array<{ node: ParsedNode; expanded: boolean }> = roots.map((node) => ({
    node,
    expanded: false,
  }));

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const { node, expanded } = frame;

    if (node.type === 'text') {
      lengths.set(node, (node.data ?? '').replace(/\s/g, '').length);
    } else if (!expanded) {
      stack.push({ node, expanded: true });
      for (const child of node.children ?? []) {
        stack.push({ node: child, expanded: false });
      }
    } else {
      let total = 0;
      for (const child of node.children ?? []) {
        total += lengths.get(child) ?? 0;
      }
      lengths.set(node, total);
    }
  }

  return lengths;
};

const selectArticleHtml = (html: string): string => {
  // Normalized before parsing, for the same reason `text.ts` does it: HTML has no
  // self-closing syntax for raw-text elements, so a spec-compliant parser reads
  // `<article><script src="x.js"/><p>IOC: evil.test</p></article>` as a script whose body
  // is that paragraph. Chrome removal then deleted the script and the report with it,
  // leaving `<article></article>`. XHTML-style feeds write this form legitimately.
  // CDATA is unwrapped before the parse, not handled after it. Selectors cannot see inside
  // a CDATA node, so chrome removal missed a `<script>` bundle carried that way while the
  // scoring walk still counted its bytes as visible text: a teaser whose CDATA held a large
  // bundle outscored the real report, won selection, and then collapsed to nothing once
  // `stripHtml` expanded the CDATA and dropped the script. Unwrapping first means both see
  // the same document the downstream stage will.
  const $ = cheerio.load(normalizeSelfClosedRawText(unwrapCdata(html)), PARSER_OPTIONS);

  // The one cast in this file, at the boundary where the transitive `@types/cheerio@0.22`
  // stops describing the DOM the installed cheerio actually returns.
  const roots = $.root().toArray() as unknown as ParsedNode[];
  if (maxDepthOf(roots) > MAX_NESTING_DEPTH) return html;

  // Page-level only. Done before selection so these never count toward a candidate's
  // score, while an article's own header/footer/aside still does.
  $(PAGE_CHROME_SELECTORS).remove();

  // Chrome removed document-wide, up front, rather than from the chosen container at the
  // end. Two reasons, and the first is severe: `$container.find(selectorList)` is quadratic
  // in the container's child count, measured at 2.7s for 50,000 children, 10.7s for 100,000
  // and 44s for 200,000, on a page well inside the byte cap and shallow enough that the
  // depth guard never fires. The identical selector list evaluated from the document root
  // is linear over the same inputs: 18ms, 34ms, 80ms. Second, it removes the need to
  // discount chrome during scoring, since it is gone before any candidate is measured.
  //
  // Equivalent to the previous behavior. Only the chosen container is ever returned, so
  // removing this chrome from outside it as well changes nothing, and scoring already
  // treated chrome as chrome wherever it sat.
  $(CHROME_SELECTORS).remove();

  /**
   * Pick the container with the most text across *all* selectors, rather than the
   * first match of the first selector that hits.
   *
   * First-match-wins had two failure modes and they compound. `ARTICLE_SELECTORS`
   * puts `article` ahead of `main`, so any `<article>` on the page beat a `<main>`
   * holding the real report; and `.first()` then took the earliest of those. A page
   * with an `<article>` teaser card above a `<main>` body returned the teaser, and
   * every IOC in the report was missed.
   *
   * Text length is a blunt proxy for "the substantive one", but it is the signal that
   * actually separates a card from a body. Selector order survives only as a tie-break,
   * so a precise `article` still beats a `main` of identical length.
   *
   * Scored after chrome removal, so a teaser carrying a large inline script or style
   * cannot outweigh the real report on raw text length, win selection, and then be
   * stripped to almost nothing.
   */
  const candidateEls = ARTICLE_SELECTORS.flatMap((selector, priority) =>
    $(selector)
      .toArray()
      .map((el) => ({ el, priority }))
  );

  // Scored with `stripHtml`, the function that actually produces `body_text`, rather than
  // with an approximation of it.
  //
  // Counting bytes in the DOM kept being wrong in the same way: markup that disappears
  // downstream still inflated a candidate. A `<script>` inside CDATA did it, and once that
  // was fixed an entity-encoded `&lt;script&gt;` body did it again, because neither is
  // visible to the chrome selectors but both are text as far as a DOM walk is concerned. In
  // both cases a teaser outscored the real report, won selection, and then collapsed to a
  // few characters, losing every indicator in the report. Any future representation the
  // downstream stage learns to strip would have been a third instance.
  //
  // Bounded rather than unconditional, because this is one parse per candidate: a page with
  // more than a few dozen article-like containers, or one larger than a couple of megabytes,
  // falls back to the linear DOM count. Mis-selecting on a page like that is acceptable;
  // spending a task worker on it is not. The choice is made once per document so every
  // candidate is measured the same way.
  const usePreciseScore =
    candidateEls.length <= PRECISE_SCORE_MAX_CANDIDATES && html.length <= PRECISE_SCORE_MAX_BYTES;

  // `roots` was captured before the removals above, which mutate the tree in place, so this
  // walk sees the post-removal document. That ordering is load-bearing: scoring candidates
  // against a tree that still contained chrome is the bug the removals exist to prevent.
  const lengths = usePreciseScore ? undefined : visibleLengths(roots);

  const candidates = candidateEls.map(({ el, priority }) => ({
    el,
    priority,
    length: usePreciseScore
      ? stripHtml($(el).html() ?? '').length
      : lengths?.get(el as unknown as ParsedNode) ?? 0,
  }));

  let $container: ReturnType<typeof $> | null = null;
  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) => {
      if (b.length !== a.length) return b.length > a.length ? b : a;
      return b.priority < a.priority ? b : a;
    });
    // An empty match must not win. A page with a stray `<article></article>` alongside
    // the real report in a plain `<div>` otherwise returned nothing at all, because the
    // empty article satisfied the selector loop and suppressed the body fallback.
    if (best.length > 0) {
      $container = $(best.el);
    }
  }

  // Fall back to the document body, or to the whole fragment when there is no body
  // element. htmlparser2 does not synthesize `<html>/<head>/<body>` the way parse5 does,
  // so a `<description>` fragment has no body to fall back to and would otherwise return
  // nothing at all.
  if ($container === null || $container.length === 0) {
    const $body = $('body');
    $container = $body.length > 0 ? $body : $.root();
  }

  return $container.html() ?? html;
};

/**
 * Strip page chrome from raw vendor HTML, returning the article body.
 *
 * Falls back to the unmodified input when the document is nested too deeply to
 * serialize. parse5's serializer recurses once per level of nesting, so a page nested
 * beyond roughly three thousand elements raises `RangeError: Maximum call stack size
 * exceeded` from inside the library. That is not reachable by any input validation here
 * short of rejecting the page outright, and returning the page with its chrome intact is
 * strictly better than failing extraction: chrome is noise the section miner mostly
 * handles, whereas a thrown error costs the whole report. The exact depth at which this
 * trips depends on stack already in use by the caller, so it has to be handled rather
 * than bounded.
 *
 * `body_text` extraction does not share this ceiling; `stripHtml` and `htmlToStructured`
 * walk iteratively and stay linear at any depth.
 */
export const extractArticleHtml = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;

  // Fetched pages are attacker-influenced and unbounded, and cheerio builds a full
  // DOM. Truncating keeps a very fat page degraded rather than failed, since the
  // article body is nearly always near the top.
  const html = capToParseBytes(rawHtml);

  try {
    return selectArticleHtml(html);
  } catch (error) {
    if (error instanceof RangeError) return html;
    throw error;
  }
};
