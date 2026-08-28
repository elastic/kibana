/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHtmlDocument } from './html_document';
import { classifyHeader, type SectionKind } from './section_headers';

const INLINE_ELEMENTS = new Set([
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
const BLOCK_ELEMENTS = new Set([
  'article',
  'aside',
  'blockquote',
  'div',
  'figure',
  'footer',
  'header',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'tfoot',
  'thead',
  'ul',
]);
const HEADING_ELEMENTS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

type OutputMode = 'plain' | 'structured';
type SerializeStep = { kind: 'node'; node: Node } | { kind: 'emit'; text: string };

interface SectionState {
  depth: number;
  kind: SectionKind;
}

/** Collapses visible whitespace into the storage representation. */
export const collapseWhitespace = (input: string): string => input.replace(/\s+/g, ' ').trim();

const pushChildren = (stack: SerializeStep[], element: Element): void => {
  const children = Array.from(element.childNodes);
  for (let index = children.length - 1; index >= 0; index--) {
    stack.push({ kind: 'node', node: children[index] });
  }
};

const updateSection = (state: SectionState, name: string, text: string): void => {
  const depth = Number(name.slice(1));
  const kind = classifyHeader(text);
  if (kind !== 'prose') {
    state.kind = kind;
    state.depth = depth;
  } else if (state.kind === 'prose' || depth <= state.depth) {
    state.kind = 'prose';
    state.depth = depth;
  }
};

const serializeElement = (
  element: Element,
  mode: OutputMode,
  section: SectionState,
  out: string[],
  stack: SerializeStep[]
): void => {
  const name = element.localName.toLowerCase();
  if (mode === 'plain') {
    if (!INLINE_ELEMENTS.has(name)) {
      out.push(' ');
      stack.push({ kind: 'emit', text: ' ' });
    }
    pushChildren(stack, element);
    return;
  }

  if (HEADING_ELEMENTS.has(name)) {
    const text = collapseWhitespace(element.textContent ?? '');
    if (text) {
      updateSection(section, name, text);
      out.push(`\n## ${text}\n`);
    }
    return;
  }
  if (name === 'br') {
    out.push('\n');
    return;
  }
  if (name === 'tr') {
    out.push('\n| ');
    stack.push({ kind: 'emit', text: '\n' });
    pushChildren(stack, element);
    return;
  }
  if (name === 'td' || name === 'th') {
    stack.push({ kind: 'emit', text: ' | ' });
    pushChildren(stack, element);
    return;
  }
  if (name === 'li') {
    out.push('\n- ');
    stack.push({ kind: 'emit', text: '\n' });
    pushChildren(stack, element);
    return;
  }
  if (name === 'a') {
    const href = element.getAttribute('href');
    if ((section.kind === 'ioc' || section.kind === 'references') && href) {
      stack.push({ kind: 'emit', text: ` ${href} ` });
    }
    pushChildren(stack, element);
    return;
  }
  if (BLOCK_ELEMENTS.has(name) || !INLINE_ELEMENTS.has(name)) {
    out.push('\n');
    stack.push({ kind: 'emit', text: '\n' });
  }
  pushChildren(stack, element);
};

const serializeDocument = (document: Document, mode: OutputMode): string => {
  const out: string[] = [];
  const section: SectionState = { depth: 0, kind: 'prose' };
  const stack: SerializeStep[] = Array.from(document.body?.childNodes ?? [], (node) => ({
    kind: 'node' as const,
    node,
  })).reverse();

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;
    if (step.kind === 'emit') {
      out.push(step.text);
    } else if (step.node.nodeType === step.node.TEXT_NODE) {
      out.push(step.node.textContent ?? '');
    } else if (step.node.nodeType === step.node.ELEMENT_NODE) {
      serializeElement(step.node as Element, mode, section, out, stack);
    }
  }

  if (mode === 'plain') return collapseWhitespace(out.join(''));
  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

/** Extracts browser-visible text from untrusted HTML. */
export const stripHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  const document = parseHtmlDocument(html);
  return document ? serializeDocument(document, 'plain') : '';
};

/** Preserves report structure and section-scoped links for IOC extraction. */
export const htmlToStructured = (html: string | undefined | null): string => {
  if (!html) return '';
  const document = parseHtmlDocument(html);
  return document ? serializeDocument(document, 'structured') : '';
};

/** Truncates text without splitting a surrogate pair. */
export const truncate = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) return input;
  if (maxLength <= 0) return '';
  const contentLength = maxLength - 1;
  const rawSlice = input.slice(0, contentLength);
  const slice = /[\uD800-\uDBFF]$/.test(rawSlice) ? rawSlice.slice(0, -1) : rawSlice;
  const lastBoundary = slice.lastIndexOf(' ');
  return lastBoundary > contentLength * 0.6
    ? `${slice.slice(0, lastBoundary).trimEnd()}…`
    : `${slice.trimEnd()}…`;
};

export interface ReportContentDocument {
  title: string;
  body_text: string;
  body_html?: string;
  language: string;
  body_is_title_fallback?: true;
}

/** Builds the content block written by every ingest path. */
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
  const isTitleFallback = !hasBody && title.trim().length > 0;
  return {
    title,
    body_text: hasBody ? bodyText : title,
    ...(bodyHtml !== undefined ? { body_html: bodyHtml } : {}),
    language,
    ...(isTitleFallback ? { body_is_title_fallback: true as const } : {}),
  };
};
