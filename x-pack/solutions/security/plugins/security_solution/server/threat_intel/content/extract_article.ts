/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import { MAX_PARSE_BYTES, normalizeSelfClosedRawText } from './text';

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
const PARSER_OPTIONS = { _useHtmlParser2: true } as const;

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
 * Visible-character count of every node's subtree, excluding chrome, in one pass.
 *
 * Scoring each candidate with its own subtree traversal was quadratic whenever candidates
 * nest, and `ARTICLE_SELECTORS` nest readily: `'<article>'.repeat(n)` produces n
 * candidates whose subtrees all overlap. Measured through this function, 16ms at n=200
 * rising to 770ms at n=1,600, from 14KB of input.
 *
 * Computing bottom-up makes every candidate a map lookup instead. A chrome subtree
 * contributes zero, which is what the per-candidate `find(CHROME).remove()` used to
 * achieve, and because chrome is chrome wherever it sits the result is identical.
 *
 * Counts non-whitespace characters rather than trimming: the previous `.text().trim()`
 * could not be expressed as a sum over subtrees, and the only thing the score is used for
 * is comparing candidates and rejecting empty ones. Both survive the change.
 */
const visibleLengths = (roots: ParsedNode[], chrome: Set<unknown>): Map<ParsedNode, number> => {
  const lengths = new Map<ParsedNode, number>();
  const stack: Array<{ node: ParsedNode; expanded: boolean }> = roots.map((node) => ({
    node,
    expanded: false,
  }));

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const { node, expanded } = frame;

    if (chrome.has(node)) {
      lengths.set(node, 0);
    } else if (node.type === 'text') {
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
  const $ = cheerio.load(normalizeSelfClosedRawText(html), PARSER_OPTIONS);

  // The one cast in this file, at the boundary where the transitive `@types/cheerio@0.22`
  // stops describing the DOM the installed cheerio actually returns.
  const roots = $.root().toArray() as unknown as ParsedNode[];
  if (maxDepthOf(roots) > MAX_NESTING_DEPTH) return html;

  // Page-level only. Done before selection so these never count toward a candidate's
  // score, while an article's own header/footer/aside still does.
  $(PAGE_CHROME_SELECTORS).remove();

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
   * Scored *after* discounting the same chrome the returned container gets. Measuring
   * before meant a teaser carrying a large inline script or style could outweigh the real
   * report on raw text length, win selection, and then be stripped to almost nothing.
   */
  const chrome = new Set<unknown>($(CHROME_SELECTORS).toArray());
  const lengths = visibleLengths(roots, chrome);

  const candidates = ARTICLE_SELECTORS.flatMap((selector, priority) =>
    $(selector)
      .toArray()
      .map((el) => ({
        el,
        priority,
        length: lengths.get(el as unknown as ParsedNode) ?? 0,
      }))
  );

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

  // Strip chrome subtrees from within the container.
  $container.find(CHROME_SELECTORS).remove();

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
  const html = rawHtml.length > MAX_PARSE_BYTES ? rawHtml.slice(0, MAX_PARSE_BYTES) : rawHtml;

  try {
    return selectArticleHtml(html);
  } catch (error) {
    if (error instanceof RangeError) return html;
    throw error;
  }
};
