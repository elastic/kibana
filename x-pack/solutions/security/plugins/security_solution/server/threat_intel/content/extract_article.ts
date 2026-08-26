/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import { MAX_PARSE_BYTES } from './text';

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

export const extractArticleHtml = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;

  // Fetched pages are attacker-influenced and unbounded, and cheerio builds a full
  // DOM. Truncating keeps a very fat page degraded rather than failed, since the
  // article body is nearly always near the top.
  const html = rawHtml.length > MAX_PARSE_BYTES ? rawHtml.slice(0, MAX_PARSE_BYTES) : rawHtml;

  const $ = cheerio.load(html);

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
   * actually separates a card from a body, and it is what the reviewer asked for.
   * Selector order survives only as a tie-break, so a precise `article` still beats a
   * `main` of identical length.
   */
  // Score each candidate *after* removing the same chrome the returned container
  // gets. Measuring before meant a teaser carrying a large inline script or style
  // could outweigh the real report on raw text length, win selection, and then be
  // stripped down to almost nothing.
  const candidates = ARTICLE_SELECTORS.flatMap((selector, priority) =>
    $(selector)
      .toArray()
      .map((el) => {
        const $scored = $(el).clone();
        $scored.find(CHROME_SELECTORS).remove();
        return { el, priority, length: $scored.text().trim().length };
      })
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

  // Fall back to <body> — never return nothing.
  if ($container === null || $container.length === 0) {
    $container = $('body');
  }

  // Strip chrome subtrees from within the container.
  $container.find(CHROME_SELECTORS).remove();

  return $container.html() ?? rawHtml;
};
