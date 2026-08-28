/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'cheerio';

/**
 * RSS/Atom is the one narrow markup boundary this feature accepts: feed entries may embed
 * an HTML fragment in `content:encoded`, an RSS `<description>`, or an Atom `html`/`xhtml`
 * construct. This turns such a fragment into bounded plain text so nothing downstream ever
 * sees, stores, or interprets markup.
 *
 * It is deliberately NOT a general HTML utility: it does not identify an article container,
 * inspect inline CSS, or fetch anything. Keep it RSS-local — do not export it for reuse.
 */

/**
 * Cap the fragment fed to the parser. Feed bodies are summaries or article text, not whole
 * sites, so anything past this is almost certainly abuse or a malformed feed; truncating
 * up front bounds parse work regardless of what the feed sends.
 */
const MAX_INPUT_CHARS = 500_000;

/** Cap the returned text so a pathological fragment cannot expand into an unbounded string. */
const MAX_OUTPUT_CHARS = 200_000;

/**
 * Subtrees whose text is never article content. Skipped entirely — and replaced with a
 * space, not deleted outright — so tokens on either side of a stripped `<script>` cannot be
 * reassembled into one (e.g. an indicator glued to adjacent code).
 */
const NON_CONTENT_TAGS = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'noembed',
  'noframes',
  'title',
  'textarea',
]);

/**
 * Elements that imply a visible boundary. A flat concatenation of descendant text would
 * collapse `<p>a</p><p>b</p>` to `ab`; emitting a space before and after each of these keeps
 * `a` and `b` as distinct tokens, which the IOC extractor depends on.
 */
const BOUNDARY_TAGS = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'aside',
  'main',
  'figure',
  'figcaption',
  'blockquote',
  'pre',
  'address',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

const collapseWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

/**
 * Minimal shape of a parsed DOM node. Cheerio hands back a discriminated union; a light
 * structural view keeps the walk readable without per-subtype narrowing, since it only ever
 * reads a text run's `data`, an element's `name`, and its `children`.
 */
interface DomNode {
  type: string;
  data?: string;
  name?: string;
  children?: DomNode[];
}

type WalkStep = { emit: string } | { node: DomNode };

/**
 * Handles one element/text node, pushing its text run to `out` and any child work back onto
 * `stack`. Split out so the walk can early-return per node without a `continue`, and factored
 * around the fact that a stripped or `<br>` subtree emits a single space and no children.
 */
const stepNode = (node: DomNode, out: string[], stack: WalkStep[]): void => {
  if (node.type === 'text') {
    // Entities are already decoded by the parser, so `data` is plain text.
    if (node.data) out.push(node.data);
    return;
  }

  // Unnamed container nodes (the document root, comments, directives) contribute no text
  // of their own; only their children matter. Named elements get the removal/boundary
  // rules below.
  const name = typeof node.name === 'string' ? node.name.toLowerCase() : undefined;

  // A stripped subtree (or an explicit break) still separates its neighbours, so tokens
  // can't fuse across it — emit a single space and skip the subtree.
  if (name === 'br' || (name !== undefined && NON_CONTENT_TAGS.has(name))) {
    out.push(' ');
    return;
  }

  const isBoundary = name !== undefined && BOUNDARY_TAGS.has(name);
  const children = node.children ?? [];

  // Push in reverse of desired emit order (LIFO): leading space, children, trailing space.
  if (isBoundary) stack.push({ emit: ' ' });
  for (let i = children.length - 1; i >= 0; i--) {
    stack.push({ node: children[i] });
  }
  if (isBoundary) stack.push({ emit: ' ' });
};

/**
 * Iteratively walks the parsed fragment, emitting text runs and inserting single-space
 * boundaries around block/break/cell/list elements. Iterative (not recursive) so a
 * pathologically deep fragment (`<div><div>...`) cannot overflow the stack, and mutation-free
 * so it stays linear in node count.
 */
const extractText = (root: DomNode): string => {
  const out: string[] = [];
  const stack: WalkStep[] = [{ node: root }];

  while (stack.length > 0) {
    const step = stack.pop();
    // The `stack.length > 0` guard makes this unreachable; the break narrows the type
    // without a non-null assertion.
    if (step === undefined) break;

    if ('emit' in step) {
      out.push(step.emit);
    } else {
      stepNode(step.node, out, stack);
    }
  }

  return collapseWhitespace(out.join(''));
};

/**
 * Converts an embedded RSS/Atom HTML fragment to bounded plain text. Fails closed to an
 * empty string if parsing throws, so a malformed feed can never surface markup or crash the
 * adapter run.
 */
export const htmlFragmentToText = (fragment: string): string => {
  if (!fragment) return '';

  const bounded = fragment.length > MAX_INPUT_CHARS ? fragment.slice(0, MAX_INPUT_CHARS) : fragment;

  try {
    // Parsed in document mode (the only shape the bundled cheerio typings expose): a fragment
    // gets wrapped in a synthetic `<html><head><body>`. That boilerplate never reaches the
    // output — `html`/`head`/`body` are unlisted elements the walk descends without emitting,
    // and `title` is in NON_CONTENT_TAGS — so the extracted text is the fragment's text alone.
    const $ = load(bounded);
    const text = extractText($.root()[0] as unknown as DomNode);

    return text.length > MAX_OUTPUT_CHARS ? text.slice(0, MAX_OUTPUT_CHARS) : text;
  } catch {
    return '';
  }
};
