/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const WHITESPACE = /\s/;

/**
 * Returns a search for the first index at or after `from` where `matches(index)` holds, or
 * `text.length` when there is none. Callers must never pass a smaller `from` than before: the
 * last result is reused while it is still ahead, so each index is examined at most once.
 */
const createForwardSearch = (
  length: number,
  matches: (index: number) => boolean
): ((from: number) => number) => {
  let lastResult = -1;

  return (from) => {
    if (from <= lastResult) {
      return lastResult;
    }

    let index = from;
    while (index < length && !matches(index)) {
      index++;
    }
    lastResult = index;

    return index;
  };
};

/**
 * Renders each `{{ field value }}` token in Attack Discovery markdown as `` `value` ``.
 *
 * A token is `{{`, optional whitespace, a field name, whitespace, a value, optional whitespace,
 * and the first `}}` after it, all on one line; anything else is kept as is. For well-formed
 * tokens this renders what `getMarkdownFields` from `@kbn/elastic-assistant-common` renders,
 * but in linear time: that helper's regular expression backtracks catastrophically on a long
 * run of whitespace after an unclosed `{{`, which a caller could send to block the server.
 */
export const renderFieldTokens = (markdown: string): string => {
  const { length } = markdown;
  const isWhitespace = (index: number) =>
    markdown[index] !== '\n' && WHITESPACE.test(markdown[index]);

  // One search per role: each is only ever called with a `from` that never decreases.
  const nextClose = createForwardSearch(
    length,
    (index) => markdown[index] === '}' && markdown[index + 1] === '}'
  );
  const nextNewline = createForwardSearch(length, (index) => markdown[index] === '\n');
  const nextFieldStart = createForwardSearch(length, (index) => !isWhitespace(index));
  const nextFieldEnd = createForwardSearch(length, (index) => isWhitespace(index));
  const nextValueStart = createForwardSearch(length, (index) => !isWhitespace(index));

  const parts: string[] = [];
  let cursor = 0;

  while (cursor < length) {
    const open = markdown.indexOf('{{', cursor);
    if (open === -1) {
      break;
    }

    const innerStart = open + 2;
    const close = nextClose(innerStart);
    if (close >= length) {
      // No `}}` follows, so no later `{{` can close either.
      break;
    }

    const fieldStart = nextFieldStart(innerStart);
    const fieldEnd = nextFieldEnd(fieldStart);
    const isToken = nextNewline(innerStart) > close && fieldStart < close && fieldEnd < close;

    if (isToken) {
      const valueStart = Math.min(nextValueStart(fieldEnd), close);
      parts.push(
        markdown.slice(cursor, open),
        `\`${markdown.slice(valueStart, close).trimEnd()}\``
      );
      cursor = close + 2;
    } else {
      parts.push(markdown.slice(cursor, innerStart));
      cursor = innerStart;
    }
  }

  parts.push(markdown.slice(cursor));

  return parts.join('');
};
