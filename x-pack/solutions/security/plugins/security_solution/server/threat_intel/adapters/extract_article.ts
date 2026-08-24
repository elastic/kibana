/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';

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
 */
const CHROME_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  'script',
  'style',
  'noscript',
  'form',
  '.sidebar',
  '.nav',
  '.menu',
  '.footer',
  '.header',
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
export const extractArticleHtml = (rawHtml: string): string => {
  if (!rawHtml) return rawHtml;

  const $ = cheerio.load(rawHtml);

  // Find the article container.
  let $container: ReturnType<typeof $> | null = null;
  for (const selector of ARTICLE_SELECTORS) {
    const $el = $(selector).first();
    if ($el.length > 0) {
      $container = $el;
      break;
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
