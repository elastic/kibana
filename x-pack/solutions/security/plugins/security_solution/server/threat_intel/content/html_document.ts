/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSDOM } from 'jsdom';

import { inlineRenderState } from './inline_style';

const MAX_HTML_BYTES = 10 * 1024 * 1024;
const REMOVED_ELEMENTS = new Set([
  'iframe',
  'noembed',
  'noframes',
  'script',
  'style',
  'template',
  'textarea',
  'title',
]);

const capHtml = (html: string): string => {
  if (html.length <= Math.floor(MAX_HTML_BYTES / 3)) return html;

  let bytes = 0;
  let index = 0;
  while (index < html.length) {
    const codeUnit = html.charCodeAt(index);
    const hasLowSurrogate =
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < html.length &&
      html.charCodeAt(index + 1) >= 0xdc00 &&
      html.charCodeAt(index + 1) <= 0xdfff;
    const width = codeUnit <= 0x7f ? 1 : codeUnit <= 0x7ff ? 2 : hasLowSurrogate ? 4 : 3;
    if (bytes + width > MAX_HTML_BYTES) return html.slice(0, index);
    bytes += width;
    index += hasLowSurrogate ? 2 : 1;
  }
  return html;
};

interface VisibilityFrame {
  element: Element;
  parent?: VisibilityFrame;
  retained: boolean;
  unwrap: boolean;
  visible: boolean;
}

type NormalizeStep =
  | { kind: 'enter'; node: Node; parent?: VisibilityFrame; parentVisible: boolean }
  | { kind: 'exit'; frame: VisibilityFrame };

const replaceWithSpace = (document: Document, node: Node): void => {
  node.parentNode?.replaceChild(document.createTextNode(' '), node);
};

const unwrapElement = (element: Element): void => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
};

const normalizeFragment = (document: Document, fragment: ParentNode): void => {
  const stack: NormalizeStep[] = Array.from(fragment.childNodes, (node) => ({
    kind: 'enter' as const,
    node,
    parentVisible: true,
  })).reverse();

  while (stack.length > 0) {
    const step = stack.pop();
    if (!step) break;

    if (step.kind === 'exit') {
      const { frame } = step;
      if (!frame.visible && !frame.retained) {
        replaceWithSpace(document, frame.element);
      } else if (frame.retained && frame.parent) {
        frame.parent.retained = true;
      }
      if (frame.unwrap && frame.element.parentNode) unwrapElement(frame.element);
    } else {
      const { node, parent, parentVisible } = step;
      if (node.nodeType === node.TEXT_NODE) {
        if (parentVisible && parent) parent.retained = true;
        else if (!parentVisible) replaceWithSpace(document, node);
      } else if (node.nodeType === node.ELEMENT_NODE) {
        const element = node as Element;
        const name = element.localName.toLowerCase();
        if (name === 'base') {
          element.parentNode?.removeChild(element);
        } else {
          const { displayHidden, visible } = inlineRenderState(
            element.getAttribute('style') ?? undefined,
            parentVisible
          );
          const subtreeHidden =
            REMOVED_ELEMENTS.has(name) || element.hasAttribute('hidden') || displayHidden;
          element.removeAttribute('style');
          element.removeAttribute('hidden');
          element.removeAttribute('aria-hidden');

          if (subtreeHidden) {
            replaceWithSpace(document, element);
          } else {
            const frame: VisibilityFrame = {
              element,
              parent,
              retained: visible,
              unwrap: name === 'noscript',
              visible,
            };
            stack.push({ kind: 'exit', frame });
            const children = Array.from(element.childNodes);
            for (let index = children.length - 1; index >= 0; index--) {
              stack.push({
                kind: 'enter',
                node: children[index],
                parent: frame,
                parentVisible: visible,
              });
            }
          }
        }
      }
    }
  }
};

const configureReadabilityDom = (document: Document, window: JSDOM['window']): void => {
  // Readability has a standards-based tag lookup fallback. Use it because JSDOM's selector
  // engine compiles selectors with Function, which the packaged Kibana server disables.
  for (const prototype of [
    window.Document.prototype,
    window.DocumentFragment.prototype,
    window.Element.prototype,
  ]) {
    Object.defineProperty(prototype, 'querySelectorAll', { value: undefined });
  }
  Object.defineProperty(document, 'baseURI', { value: document.URL });
};

/** Builds and normalizes the single DOM shared by extraction consumers. */
export const parseHtmlDocument = (html: string): Document | undefined => {
  try {
    const { window } = new JSDOM();
    const document = new window.DOMParser().parseFromString(capHtml(html), 'text/html');
    normalizeFragment(document, document);
    configureReadabilityDom(document, window);
    return document;
  } catch {
    return undefined;
  }
};

export const normalizedBodyHtml = (document: Document): string =>
  document.body?.innerHTML ?? document.documentElement?.innerHTML ?? '';
