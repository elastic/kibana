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

type CustomPropertyValue = CssPropertyValue;

export interface InlineRenderState {
  displayHidden: boolean;
  visible: boolean;
}

const CSS_WIDE_KEYWORDS = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer']);
const INHERITED_CSS_WIDE_KEYWORDS = new Set(['inherit', 'unset', 'revert', 'revert-layer']);
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

const cssIdentifier = (input: string): string =>
  cssIdentifierCodec.decode(trimCssWhitespace(input));

const hasUnresolvedSubstitution = (value: CssNode): boolean => {
  let result = false;
  walk(value, (node) => {
    if (node.type === 'Function' && ['var', 'env'].includes(normalizedCssIdentifier(node.name))) {
      result = true;
    }
  });
  return result;
};

const importantPriority = (priority: boolean | string): boolean | undefined => {
  if (priority === true) return true;
  if (priority === false) return false;
  return normalizedCssIdentifier(priority) === 'important' ? true : undefined;
};

const applyCustomProperty = (
  property: string,
  value: CustomPropertyValue,
  properties: Map<string, CustomPropertyValue>
): void => {
  const current = properties.get(property);
  if (!current?.important || value.important) properties.set(property, value);
};

const MAX_SUBSTITUTION_DEPTH = 16;

const resolveSubstitution = (
  input: string,
  properties: Map<string, CustomPropertyValue>,
  resolvedProperties: Map<string, string | undefined>,
  seen = new Set<string>(),
  depth = 0
): string | undefined => {
  if (depth >= MAX_SUBSTITUTION_DEPTH) return undefined;

  const value = parse(input, { context: 'value', positions: false });
  if (value.type !== 'Value') return undefined;
  const nodes = value.children.toArray();
  if (nodes.length !== 1 || nodes[0].type !== 'Function') {
    return normalizedCssIdentifier(generate(value));
  }

  const fn = nodes[0];
  if (normalizedCssIdentifier(fn.name) !== 'var') return undefined;
  const args = fn.children.toArray();
  const name = args[0]?.type === 'Identifier' ? cssIdentifier(args[0].name) : undefined;
  const comma = args.findIndex((node) => node.type === 'Operator' && node.value === ',');
  const fallback =
    comma < 0
      ? undefined
      : args
          .slice(comma + 1)
          .map((node) => generate(node))
          .join('');
  const resolveFallback = (): string | undefined =>
    fallback === undefined
      ? undefined
      : resolveSubstitution(fallback, properties, resolvedProperties, seen, depth + 1);

  if (!name?.startsWith('--') || seen.has(name)) return resolveFallback();
  const custom = properties.get(name);
  if (!custom) return resolveFallback();

  if (resolvedProperties.has(name)) return resolvedProperties.get(name) ?? resolveFallback();

  const nextSeen = new Set(seen).add(name);
  const resolved = resolveSubstitution(
    custom.value,
    properties,
    resolvedProperties,
    nextSeen,
    depth + 1
  );
  resolvedProperties.set(name, resolved);
  return resolved ?? resolveFallback();
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

const inlineStyleState = (
  style: string | undefined
): { displayHidden: boolean; visibility?: 'hidden' | 'visible' } => {
  if (!style) return { displayHidden: false };

  try {
    const declarationList = parse(style, { context: 'declarationList', positions: false });
    if (declarationList.type !== 'DeclarationList') return { displayHidden: false };

    const declarations = declarationList.children
      .toArray()
      .filter((declaration) => declaration.type === 'Declaration');
    const customProperties = new Map<string, CustomPropertyValue>();
    for (const declaration of declarations) {
      const property = cssIdentifier(declaration.property);
      if (property.startsWith('--')) {
        const important = importantPriority(declaration.important);
        if (important !== undefined) {
          applyCustomProperty(
            property,
            { value: generate(declaration.value), important },
            customProperties
          );
        }
      }
    }

    const state: { display?: CssPropertyValue; visibility?: CssPropertyValue } = {};
    const resolvedProperties = new Map<string, string | undefined>();
    declarations.forEach((declaration) => {
      if (declaration.value.type === 'Raw') return;

      const important = importantPriority(declaration.important);
      if (important === undefined) return;

      const property = normalizedCssIdentifier(declaration.property);
      if (property !== 'display' && property !== 'visibility' && property !== 'all') return;

      const serializedValue = generate(declaration.value);
      const hasSubstitution = hasUnresolvedSubstitution(declaration.value);
      const resolvedValue = hasSubstitution
        ? resolveSubstitution(serializedValue, customProperties, resolvedProperties)
        : serializedValue;
      const value = resolvedValue === undefined ? '' : normalizedCssIdentifier(resolvedValue);
      const matchesGrammar =
        lexer.matchProperty(property, declaration.value).error === null ||
        (value.length > 0 && lexer.matchProperty(property, value).error === null);
      if (!matchesGrammar && !hasSubstitution) {
        return;
      }

      const propertyValue = { value, important };
      if (property === 'all') {
        if (!CSS_WIDE_KEYWORDS.has(value) && !hasSubstitution) return;

        applyProperty('display', { value: '', important: propertyValue.important }, state);
        const visibility =
          !CSS_WIDE_KEYWORDS.has(value) || INHERITED_CSS_WIDE_KEYWORDS.has(value) ? '' : 'visible';
        applyProperty(
          'visibility',
          { value: visibility, important: propertyValue.important },
          state
        );
      } else {
        applyProperty(property, propertyValue, state);
      }
    });

    let visibility: 'hidden' | 'visible' | undefined;
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

/** Resolves the supported inline render state for one element. */
export const inlineRenderState = (
  style: string | undefined,
  parentVisible: boolean
): InlineRenderState => {
  const { displayHidden, visibility } = inlineStyleState(style);
  const visible = visibility === 'hidden' ? false : visibility === 'visible' || parentVisible;
  return { displayHidden, visible };
};
