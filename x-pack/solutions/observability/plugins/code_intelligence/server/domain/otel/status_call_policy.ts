/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { supportsHashComments } from './source_comment_policy';

/** Returns whether one balanced status-call argument list contains a supported executable error code. */
export const hasSupportedStatusErrorArgument = ({
  content,
  openParenthesis,
  path,
}: {
  readonly content: string;
  readonly openParenthesis: number;
  readonly path: string;
}): boolean => {
  /** The target call must start at an opening parenthesis. */
  if (content[openParenthesis] !== '(') return false;
  /** Nested delimiters must close in their original order before the target call completes. */
  const delimiters: string[] = ['('];
  /** Active quotes exclude descriptive text from error-code recognition. */
  let quote: string | undefined;
  /** Escapes suppress quote handling for one following character. */
  let escaped: boolean = false;
  /** Line comments end at newline and never establish an error code. */
  let lineComment: boolean = false;
  /** Block comments end at their closing delimiter and never establish an error code. */
  let blockComment: boolean = false;
  /** Retains executable argument text for supported-code recognition. */
  let argumentsText: string = '';
  for (let index: number = openParenthesis + 1; index < content.length; index += 1) {
    /** Reads ahead only for paired lexical delimiters. */
    const character: string = content[index];
    /** Supports slash-comment and block-comment delimiters. */
    const nextCharacter: string = content[index + 1] ?? '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      else continue;
    }
    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '#' && supportsHashComments(path)) {
      lineComment = true;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(' || character === '{' || character === '[') {
      delimiters.push(character);
      argumentsText += character;
      continue;
    }
    if (character === ')' || character === '}' || character === ']') {
      /** Mismatched delimiters cannot terminate the target call safely. */
      const expectedOpening: string = character === ')' ? '(' : character === '}' ? '{' : '[';
      if (delimiters.at(-1) !== expectedOpening) return false;
      delimiters.pop();
      if (delimiters.length === 0)
        return /(?:SpanStatusCode\.(?:ERROR|Error)|ActivityStatusCode\.Error|codes\.Error|\bStatusCode\.(?:ERROR|Error)|StatusCode::(?:ERROR|Error)|\bStatus::(?:ERROR|Error)|\bkError\b)/.test(
          argumentsText
        );
      argumentsText += character;
      continue;
    }
    argumentsText += character;
  }
  return false;
};
