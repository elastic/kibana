/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Tokenizer, TokenizerMode, type TokenHandler, type Token as Parse5Token } from 'parse5';

const RAW_TEXT_TAG_NAMES = new Set(['script', 'style']);

interface SourceRange {
  start: number;
  end: number;
}

interface ActiveRawText {
  name: string;
  start: number;
}

interface RawTextSanitization {
  html: string;
  hasUnclosedRawText: boolean;
}

const tokenRange = (token: Parse5Token.TagToken): SourceRange => {
  if (!token.location) {
    throw new Error('parse5 did not provide a source location for an HTML tag');
  }

  return { start: token.location.startOffset, end: token.location.endOffset };
};

const replaceRangesWithSpaces = (html: string, ranges: SourceRange[]): string => {
  if (ranges.length === 0) return html;

  const pieces: string[] = [];
  let copiedTo = 0;
  for (const range of ranges) {
    if (range.start < copiedTo || range.end < range.start) {
      throw new Error('parse5 produced overlapping or inverted raw-text ranges');
    }
    pieces.push(html.slice(copiedTo, range.start), ' ');
    copiedTo = range.end;
  }
  pieces.push(html.slice(copiedTo));
  return pieces.join('');
};

const tokenizeRawTextRanges = (
  html: string
): { ranges: SourceRange[]; hasUnclosedRawText: boolean } => {
  const ranges: SourceRange[] = [];
  let activeRawText: ActiveRawText | undefined;
  let hasUnclosedRawText = false;
  const tokenizerRef: { current?: Tokenizer } = {};

  const handler: TokenHandler = {
    onStartTag: (token) => {
      if (!RAW_TEXT_TAG_NAMES.has(token.tagName)) return;

      const range = tokenRange(token);
      if (token.selfClosing) {
        ranges.push(range);
        return;
      }

      activeRawText = { name: token.tagName, start: range.start };
      const tokenizer = tokenizerRef.current;
      if (!tokenizer) throw new Error('parse5 tokenizer is not initialized');
      tokenizer.state =
        token.tagName === 'script' ? TokenizerMode.SCRIPT_DATA : TokenizerMode.RAWTEXT;
    },
    onEndTag: (token) => {
      if (!activeRawText || token.tagName !== activeRawText.name) return;

      const { end } = tokenRange(token);
      ranges.push({ start: activeRawText.start, end });
      activeRawText = undefined;
    },
    onEof: () => {
      if (!activeRawText) return;

      ranges.push({ start: activeRawText.start, end: html.length });
      activeRawText = undefined;
      hasUnclosedRawText = true;
    },
    onCharacter: () => {},
    onNullCharacter: () => {},
    onWhitespaceCharacter: () => {},
    onComment: () => {},
    onDoctype: () => {},
  };

  const tokenizer = new Tokenizer({ sourceCodeLocationInfo: true }, handler);
  tokenizerRef.current = tokenizer;
  // Threat feeds use CDATA outside foreign elements. This matches Cheerio's
  // `recognizeCDATA` option and prevents markup-looking CDATA text from becoming tokens.
  tokenizer.inForeignNode = true;
  tokenizer.write(html, true);

  return { ranges, hasUnclosedRawText };
};

/** Removes HTML raw-text elements using parse5's tokenizer as the lexical authority. */
export const sanitizeRawText = (html: string): RawTextSanitization => {
  if (typeof html !== 'string') {
    throw new TypeError('Raw HTML must be a string');
  }

  try {
    const { ranges, hasUnclosedRawText } = tokenizeRawTextRanges(html);
    return { html: replaceRangesWithSpaces(html, ranges), hasUnclosedRawText };
  } catch {
    // The flag is reserved for a successfully tokenized, genuinely unclosed element.
    // Keeping it false here prevents CDATA compatibility handling from emitting the
    // original, untrusted input when tokenization itself did not complete.
    return { html: '', hasUnclosedRawText: false };
  }
};
