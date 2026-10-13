/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'cheerio';

const MAX_INPUT_CHARS = 500_000;
const MAX_OUTPUT_CHARS = 200_000;

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

const BLOCK_TAGS = new Set([
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
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
]);

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

interface DomNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
}

type WalkStep = { emit: string } | { node: DomNode };

const pushChildren = (stack: WalkStep[], children: readonly DomNode[]): void => {
  for (let index = children.length - 1; index >= 0; index -= 1) {
    stack.push({ node: children[index] });
  }
};

const stepNode = (node: DomNode, output: string[], stack: WalkStep[]): void => {
  if (node.type === 'text') {
    if (node.data) output.push(node.data);
    return;
  }

  const name = typeof node.name === 'string' ? node.name.toLowerCase() : undefined;
  const isHidden =
    node.attribs !== undefined && Object.prototype.hasOwnProperty.call(node.attribs, 'hidden');
  if (name === 'br' || isHidden || (name !== undefined && NON_CONTENT_TAGS.has(name))) {
    output.push('\n');
    return;
  }

  const children = node.children ?? [];
  if (name !== undefined && HEADING_TAGS.has(name)) {
    stack.push({ emit: '\n' });
    pushChildren(stack, children);
    stack.push({ emit: '\n## ' });
    return;
  }

  if (name === 'li') {
    stack.push({ emit: '\n' });
    pushChildren(stack, children);
    stack.push({ emit: '\n- ' });
    return;
  }

  if (name === 'td' || name === 'th') {
    pushChildren(stack, children);
    stack.push({ emit: ' | ' });
    return;
  }

  if (name !== undefined && BLOCK_TAGS.has(name)) {
    stack.push({ emit: '\n' });
    pushChildren(stack, children);
    stack.push({ emit: '\n' });
    return;
  }

  pushChildren(stack, children);
};

const normalizeLines = (value: string): string =>
  value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

const truncateOutput = (value: string): string => {
  if (value.length <= MAX_OUTPUT_CHARS) return value;
  const slice = value.slice(0, MAX_OUTPUT_CHARS);
  return /[\uD800-\uDBFF]$/.test(slice) ? slice.slice(0, -1) : slice;
};

const serialize = (root: DomNode): string => {
  const output: string[] = [];
  const stack: WalkStep[] = [{ node: root }];

  while (stack.length > 0) {
    const step = stack.pop();
    if (step === undefined) break;
    if ('emit' in step) {
      output.push(step.emit);
    } else {
      stepNode(step.node, output, stack);
    }
  }

  return normalizeLines(output.join(''));
};

/** Converts an embedded RSS HTML fragment to bounded structured text. */
export const htmlFragmentToStructuredText = (fragment: string): string => {
  if (!fragment) return '';
  const bounded = fragment.slice(0, MAX_INPUT_CHARS);

  try {
    const document = load(bounded);
    return truncateOutput(serialize(document.root()[0] as unknown as DomNode));
  } catch {
    return '';
  }
};
