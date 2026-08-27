/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generate, ident, lexer, parse, walk, type CssNode } from 'css-tree';

interface CssPropertyValue {
  value: string;
  important: boolean;
}

interface InlineStyleState {
  displayHidden: boolean;
  visibility?: 'hidden' | 'visible';
}

interface ElementRenderState {
  subtreeHidden: boolean;
  visible: boolean;
}

const CSS_WIDE_KEYWORDS = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer']);
const INHERITED_CSS_WIDE_KEYWORDS = new Set(['inherit', 'unset', 'revert', 'revert-layer']);
const NON_RENDERED_NAMES = new Set(['template', 'iframe']);
const CSS_WHITESPACE_AT_EDGES = /^[ \t\r\n\f]+|[ \t\r\n\f]+$/g;

interface CssIdentifierCodec {
  decode(input: string): string;
}

// css-tree 3 exposes the identifier codec at runtime, while the compatible DefinitelyTyped
// package still describes the css-tree 2 definition-syntax helper under the same name.
const cssIdentifierCodec = ident as unknown as CssIdentifierCodec;

const trimCssWhitespace = (input: string): string => input.replace(CSS_WHITESPACE_AT_EDGES, '');

const normalizedCssIdentifier = (input: string): string =>
  cssIdentifierCodec.decode(trimCssWhitespace(input)).toLowerCase();

const hasUnresolvedSubstitution = (value: CssNode): boolean => {
  let result = false;
  walk(value, (node) => {
    if (node.type === 'Function' && ['var', 'env'].includes(normalizedCssIdentifier(node.name))) {
      result = true;
    }
  });
  return result;
};

const applyProperty = (
  property: 'display' | 'visibility',
  value: CssPropertyValue,
  state: { display?: CssPropertyValue; visibility?: CssPropertyValue }
): void => {
  const current = state[property];
  if (!current?.important || value.important) {
    state[property] = value;
  }
};

const inlineStyleState = (style: string | undefined): InlineStyleState => {
  if (!style) return { displayHidden: false };

  try {
    const declarationList = parse(style, { context: 'declarationList', positions: false });
    if (declarationList.type !== 'DeclarationList') return { displayHidden: false };

    const state: { display?: CssPropertyValue; visibility?: CssPropertyValue } = {};
    declarationList.children.forEach((declaration) => {
      if (declaration.type !== 'Declaration' || declaration.value.type === 'Raw') return;

      const priority = declaration.important;
      const important =
        priority === true ||
        (typeof priority === 'string' && normalizedCssIdentifier(priority) === 'important');
      if (priority && !important) return;

      const property = normalizedCssIdentifier(declaration.property);
      if (property !== 'display' && property !== 'visibility' && property !== 'all') return;

      const value = normalizedCssIdentifier(generate(declaration.value));
      const unresolvedSubstitution = hasUnresolvedSubstitution(declaration.value);
      const matchesGrammar =
        lexer.matchProperty(property, declaration.value).matched !== null ||
        lexer.matchProperty(property, value).matched !== null;
      if (!matchesGrammar && !unresolvedSubstitution) {
        return;
      }

      const propertyValue = { value, important };
      if (property === 'all') {
        if (!CSS_WIDE_KEYWORDS.has(value) && !unresolvedSubstitution) return;

        applyProperty('display', { value: '', important: propertyValue.important }, state);
        const visibility =
          unresolvedSubstitution || INHERITED_CSS_WIDE_KEYWORDS.has(value) ? '' : 'visible';
        applyProperty(
          'visibility',
          { value: visibility, important: propertyValue.important },
          state
        );
      } else {
        applyProperty(property, propertyValue, state);
      }
    });

    let visibility: InlineStyleState['visibility'];
    if (state.visibility?.value === 'hidden' || state.visibility?.value === 'collapse') {
      visibility = 'hidden';
    } else if (state.visibility?.value === 'visible' || state.visibility?.value === 'initial') {
      visibility = 'visible';
    }

    return { displayHidden: state.display?.value === 'none', visibility };
  } catch {
    return { displayHidden: false };
  }
};

/** Resolves the inline render state shared by article scoring and text extraction. */
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
