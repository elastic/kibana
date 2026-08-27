/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHtml, type ParsedNode } from './html_parser';
import { elementRenderState } from './inline_style';
import { capToParseBytes, stripHtml } from './text';

/** Ordered list of container selectors. Order breaks ties between equal-sized candidates. */
const ARTICLE_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.blog-post',
] as const;

// Article-owned header/footer/aside and reader-visible noscript are intentionally preserved.
const CHROME_SELECTORS = [
  'nav',
  '[role="navigation"]',
  'script',
  'style',
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

/** Chrome only at page level; article-owned semantic elements remain content. */
const PAGE_CHROME_SELECTORS = [
  'body > header',
  'body > footer',
  'body > aside',
  'body > .header',
  'body > .footer',
].join(', ');

/** Bounds selector cost; deeper pages degrade to unsimplified input. */
const MAX_NESTING_DEPTH = 256;

/** Bounds repeated downstream parsing during precise candidate scoring. */
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
    for (const child of frame.node.children ?? []) {
      stack.push({ node: child, depth: frame.depth + 1 });
    }
  }

  return max;
};

/** Computes every visible subtree length once, including nested candidates. */
const elementStates = (
  roots: ParsedNode[],
  pageChrome: Set<unknown>
): {
  visibilities: Map<ParsedNode, boolean>;
  excluded: Map<ParsedNode, boolean>;
} => {
  const visibilities = new Map<ParsedNode, boolean>();
  const excluded = new Map<ParsedNode, boolean>();
  const stack: Array<{ node: ParsedNode; parentVisible: boolean; parentExcluded: boolean }> =
    roots.map((node) => ({ node, parentVisible: true, parentExcluded: false }));

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const { node, parentVisible, parentExcluded } = frame;
    const { subtreeHidden, visible } = elementRenderState(node, parentVisible);
    const isExcluded = parentExcluded || subtreeHidden || pageChrome.has(node);
    visibilities.set(node, visible);
    excluded.set(node, isExcluded);
    for (const child of node.children ?? []) {
      stack.push({ node: child, parentVisible: visible, parentExcluded: isExcluded });
    }
  }

  return { visibilities, excluded };
};

const visibleLengths = (
  roots: ParsedNode[],
  visibilities: Map<ParsedNode, boolean>,
  excluded: Map<ParsedNode, boolean>
): Map<ParsedNode, number> => {
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
      lengths.set(node, visibilities.get(node) ? (node.data ?? '').replace(/\s/g, '').length : 0);
    } else if (excluded.get(node)) {
      lengths.set(node, 0);
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

/** Keeps wrapper visibility semantics when returning only an element's inner HTML. */
const innerHtmlWithRenderState = (
  innerHtml: string,
  node: ParsedNode,
  visibilities: Map<ParsedNode, boolean>,
  excluded: Map<ParsedNode, boolean>
): string => {
  if (excluded.get(node)) {
    return '';
  }
  return visibilities.get(node) === false
    ? `<div style="visibility:hidden">${innerHtml}</div>`
    : innerHtml;
};

const selectArticleHtml = (html: string): string => {
  const { $, roots } = parseHtml(html);
  if (maxDepthOf(roots) > MAX_NESTING_DEPTH) return html;

  // Root selection is linear where `$container.find()` is quadratic on wide input.
  $(CHROME_SELECTORS).remove();

  const seenCandidates = new Set<unknown>();
  const candidateEls = ARTICLE_SELECTORS.flatMap((selector, priority) =>
    $(selector)
      .toArray()
      .map((el) => ({ el, priority }))
      .filter(({ el }) => {
        if (seenCandidates.has(el)) return false;
        seenCandidates.add(el);
        return true;
      })
  );

  // Precise scoring uses the downstream text semantics; large pages use the linear map.
  const usePreciseScore =
    candidateEls.length <= PRECISE_SCORE_MAX_CANDIDATES &&
    Buffer.byteLength(html, 'utf8') <= PRECISE_SCORE_MAX_BYTES;

  const pageChrome = new Set<unknown>($(PAGE_CHROME_SELECTORS).toArray());
  const { visibilities, excluded } = elementStates(roots, pageChrome);
  const lengths = usePreciseScore ? undefined : visibleLengths(roots, visibilities, excluded);

  const candidates = candidateEls.map(({ el, priority }) => {
    const node = el as unknown as ParsedNode;
    const innerHtml = $(el).html() ?? '';
    const scoreHtml = innerHtmlWithRenderState(innerHtml, node, visibilities, excluded);
    let length = 0;
    if (!excluded.get(node)) {
      length = usePreciseScore ? stripHtml(scoreHtml).length : lengths?.get(node) ?? 0;
    }
    return {
      el,
      node,
      priority,
      length,
    };
  });

  let $container: ReturnType<typeof $> | null = null;
  let containerNode: ParsedNode | null = null;
  if (candidates.length > 0) {
    const best = candidates.reduce((a, b) => {
      if (b.length !== a.length) return b.length > a.length ? b : a;
      return b.priority < a.priority ? b : a;
    });
    if (best.length > 0) {
      $container = $(best.el);
      containerNode = best.node;
    }
  }

  if ($container !== null && $container.length > 0 && containerNode !== null) {
    const innerHtml = $container.html() ?? html;
    return innerHtmlWithRenderState(innerHtml, containerNode, visibilities, excluded);
  }

  // Fragment mode does not synthesize a body, so the root remains the final fallback.
  const $body = $('body');
  if ($body.length > 0) {
    const bodyNode = $body.get(0) as unknown as ParsedNode | undefined;
    const innerHtml = $body.html() ?? html;
    return bodyNode === undefined
      ? innerHtml
      : innerHtmlWithRenderState(innerHtml, bodyNode, visibilities, excluded);
  }

  return $.root().html() ?? html;
};

/** Removes known page chrome and returns the most substantive visible container. */
export const extractArticleHtml = (rawHtml: string): string => {
  if (typeof rawHtml !== 'string') throw new TypeError('Raw HTML must be a string');
  if (!rawHtml) return rawHtml;

  const html = capToParseBytes(rawHtml);

  try {
    return selectArticleHtml(html);
  } catch (error) {
    if (error instanceof RangeError) return html;
    throw error;
  }
};
