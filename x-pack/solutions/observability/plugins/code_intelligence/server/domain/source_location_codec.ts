/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** Encodes excerpts by UTF-8 byte length without importing Node-only type declarations. */
const utf8Encoder = new TextEncoder();

/** Validates required text fields contain at least one non-whitespace character. */
export const nonEmptyStringRt = t.refinement(
  t.string,
  (value) => value.trim().length > 0,
  'NonEmptyString'
);
/** Detects ASCII control characters that are unsafe in repository path transport formats. */
const containsControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    /** Holds the Unicode code point used to reject C0 and DEL controls. */
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
  });

/** Rejects absolute and traversal paths so evidence stays repository-relative. */
export const repositoryRelativePathRt = t.refinement(
  t.string,
  (value) => {
    if (
      value.length === 0 ||
      value.startsWith('/') ||
      /^[a-z]:/i.test(value) ||
      value.includes('\\') ||
      containsControlCharacter(value)
    ) {
      return false;
    }

    return value
      .split('/')
      .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  },
  'RepositoryRelativePath'
);
/** Limits retained source evidence to a non-empty 16 KiB excerpt. */
export const boundedExcerptRt = t.refinement(
  t.string,
  (value) =>
    value.length > 0 && value.length <= 16_384 && utf8Encoder.encode(value).byteLength <= 16_384,
  'BoundedExcerpt'
);
/** Validates 1-based source line numbers and other positive counters. */
export const positiveIntegerRt = t.refinement(
  t.number,
  (value) => Number.isSafeInteger(value) && value > 0,
  'PositiveInteger'
);

/** A bounded source excerpt retained as evidence for a discovered signal. */
export const sourceLocationRt = t.type({
  excerpt: boundedExcerptRt,
  line: positiveIntegerRt,
  path: repositoryRelativePathRt,
});

export type SourceLocation = t.TypeOf<typeof sourceLocationRt>;
