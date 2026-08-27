/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as cheerio from 'cheerio';
import { Tokenizer, TokenizerMode, type TokenHandler, type Token as Parse5Token } from 'parse5';

/** Minimal node shape at the boundary where stale transitive Cheerio types diverge. */
export interface ParsedNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  parent?: ParsedNode | null;
  children?: ParsedNode[];
  startIndex?: number | null;
}

const RAW_TEXT_NAMES = new Set(['script', 'style']);
const TEXT_ONLY_NAMES = new Set([
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
  'textarea',
  'title',
  'xmp',
]);

const PARSER_OPTIONS = {
  _useHtmlParser2: true,
  recognizeCDATA: true,
  recognizeSelfClosing: true,
  withStartIndices: true,
} as const;

interface SourceRange {
  start: number;
  end: number;
}

export interface ParsedHtml {
  $: ReturnType<typeof cheerio.load>;
  roots: ParsedNode[];
  nodes: ParsedNode[];
  hasUnclosedRawText: boolean;
}

const tokenEnd = (token: Parse5Token.TagToken): number => {
  if (!token.location) throw new Error('parse5 did not return a tag location');
  return token.location.endOffset;
};

const rawTextRange = (
  html: string,
  start: number,
  end: number,
  expectedName: string
): { range: SourceRange; unclosed: boolean } => {
  let range: SourceRange | undefined;
  let active = false;
  let unclosed = false;
  const tokenizerRef: { current?: Tokenizer } = {};

  const handler: TokenHandler = {
    onStartTag: (token) => {
      if (active || range) return;
      if (token.location?.startOffset !== 0 || token.tagName !== expectedName) {
        throw new Error('DOM raw-text location did not begin with the expected tag');
      }
      if (token.selfClosing) {
        range = { start, end: start + tokenEnd(token) };
        tokenizerRef.current?.pause();
        return;
      }
      active = true;
      const currentTokenizer = tokenizerRef.current;
      if (!currentTokenizer) throw new Error('parse5 tokenizer was not initialized');
      currentTokenizer.state =
        expectedName === 'script' ? TokenizerMode.SCRIPT_DATA : TokenizerMode.RAWTEXT;
    },
    onEndTag: (token) => {
      if (!active || token.tagName !== expectedName) return;
      range = { start, end: start + tokenEnd(token) };
      active = false;
      tokenizerRef.current?.pause();
    },
    onEof: () => {
      if (!active) return;
      range = { start, end };
      active = false;
      unclosed = true;
    },
    onCharacter: () => {},
    onNullCharacter: () => {},
    onWhitespaceCharacter: () => {},
    onComment: () => {},
    onDoctype: () => {},
  };

  const tokenizer = new Tokenizer({ sourceCodeLocationInfo: true }, handler);
  tokenizerRef.current = tokenizer;
  tokenizer.write(html.slice(start, end), true);
  if (!range) throw new Error('parse5 did not finish the raw-text range');
  return { range, unclosed };
};

const rawTextNodes = (roots: ParsedNode[]): Array<{ name: string; start: number }> => {
  const matches: Array<{ name: string; start: number }> = [];
  const stack = roots.map((node) => ({ node, textOnlyAncestor: false })).reverse();
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const { node, textOnlyAncestor } = frame;
    const name = node.name?.toLowerCase();
    if (
      !textOnlyAncestor &&
      name &&
      RAW_TEXT_NAMES.has(name) &&
      typeof node.startIndex === 'number'
    ) {
      matches.push({ name, start: node.startIndex });
    }
    const childrenAreTextOnly =
      textOnlyAncestor || (name !== undefined && TEXT_ONLY_NAMES.has(name));
    const children = node.children ?? [];
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index], textOnlyAncestor: childrenAreTextOnly });
    }
  }
  return matches.sort((left, right) => left.start - right.start);
};

const replaceRanges = (html: string, ranges: SourceRange[]): string => {
  if (ranges.length === 0) return html;
  const pieces: string[] = [];
  let copiedTo = 0;
  for (const range of ranges) {
    if (range.start < copiedTo || range.end < range.start) {
      throw new Error('Raw-text ranges overlap or are inverted');
    }
    pieces.push(html.slice(copiedTo, range.start), ' ');
    copiedTo = range.end;
  }
  pieces.push(html.slice(copiedTo));
  return pieces.join('');
};

const load = (html: string): Pick<ParsedHtml, '$' | 'roots' | 'nodes'> => {
  const $ = cheerio.load(html, PARSER_OPTIONS);
  const roots = $.root().toArray() as unknown as ParsedNode[];
  return { $, roots, nodes: roots.flatMap((root) => root.children ?? []) };
};

/** Parses once for context, then removes exact parser-defined raw-text source ranges. */
export const parseHtml = (html: string): ParsedHtml => {
  const initial = load(html);
  const candidates = rawTextNodes(initial.roots);
  if (candidates.length === 0) return { ...initial, hasUnclosedRawText: false };

  try {
    let hasUnclosedRawText = false;
    const ranges = candidates.map(({ name, start }, index) => {
      // Adjacent candidate starts partition the source, so tokenization never copies or
      // scans the same suffix repeatedly. The tokenizer pauses as soon as this range ends.
      const end = candidates[index + 1]?.start ?? html.length;
      const result = rawTextRange(html, start, end, name);
      hasUnclosedRawText ||= result.unclosed;
      return result.range;
    });
    return { ...load(replaceRanges(html, ranges)), hasUnclosedRawText };
  } catch {
    return { ...load(''), hasUnclosedRawText: false };
  }
};
