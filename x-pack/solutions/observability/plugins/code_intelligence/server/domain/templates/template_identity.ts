/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import type { QueryTemplate } from '../models/query_codec';

/** Identifies the immutable extraction scope represented by a generated template. */
export interface TemplateIdentityInput {
  readonly extractorVersion: string;
  readonly query: string;
  readonly repository: string;
  readonly revision: string;
  readonly signalType: QueryTemplate['signalType'];
}

/**
 * Encodes strings explicitly so normal Unicode bytes and unpaired surrogates retain their existing identity.
 *
 * This shared package is server-only, so Node's crypto implementation is supported; the byte helper remains
 * necessary because crypto.update(string) would replace unpaired surrogates with U+FFFD.
 */
const encodeUtf8PreservingSurrogates = (value: string): Uint8Array => {
  /** Holds the encoded bytes before they are copied into a typed array. */
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    /** Reads one UTF-16 code unit without replacing an unpaired surrogate. */
    const codeUnit: number = value.charCodeAt(index);
    /** Combines a valid surrogate pair into its Unicode scalar value. */
    const codePoint: number =
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
        ? (codeUnit - 0xd800) * 1024 + (value.charCodeAt(++index) - 0xdc00) + 0x10000
        : codeUnit;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 + Math.floor(codePoint / 64), 0x80 + (codePoint % 64));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 + Math.floor(codePoint / 4096),
        0x80 + (Math.floor(codePoint / 64) % 64),
        0x80 + (codePoint % 64)
      );
    } else {
      bytes.push(
        0xf0 + Math.floor(codePoint / 262144),
        0x80 + (Math.floor(codePoint / 4096) % 64),
        0x80 + (Math.floor(codePoint / 64) % 64),
        0x80 + (codePoint % 64)
      );
    }
  }
  return new Uint8Array(bytes);
};

/** Returns the complete SHA-256 hex digest of preserved source text for durable content-drift detection. */
export const sha256Digest = (value: string): string =>
  createHash('sha256').update(encodeUtf8PreservingSurrogates(value)).digest('hex');

/** Collapses formatting outside ES|QL literals and quoted identifiers for stable template identity. */
export const normalizeTemplateQuery = (query: string): string => {
  /** Holds the normalized query text assembled one character at a time. */
  let normalized: string = '';
  /** Tracks whether the cursor is inside a double-quoted ES|QL string. */
  let inString: boolean = false;
  /** Tracks whether the cursor is inside an ES|QL triple-quoted string. */
  let inTripleString: boolean = false;
  /** Tracks whether the cursor is inside a backtick-quoted ES|QL identifier. */
  let inIdentifier: boolean = false;
  /** Tracks an ES|QL line comment until its newline restores executable query text. */
  let inLineComment: boolean = false;
  /** Drops indentation immediately following a preserved executable line-comment boundary. */
  let atLineStart: boolean = false;
  /** Records whether whitespace has already been emitted for the current run. */
  let pendingWhitespace: boolean = false;

  for (let index = 0; index < query.length; index += 1) {
    /** Selects the current source character. */
    const character: string = query[index];
    if (inTripleString) {
      /** Triple-quoted literals retain every internal quote and whitespace character verbatim. */
      if (query.slice(index, index + 3) === '"""') {
        normalized += '"""';
        index += 2;
        inTripleString = false;
      } else {
        normalized += character;
      }
      continue;
    }
    if (inLineComment) {
      /** Normalizes either physical newline spelling into the executable line-comment boundary. */
      if (character === '\r' || character === '\n') {
        normalized += '\n';
        if (character === '\r' && query[index + 1] === '\n') index += 1;
        inLineComment = false;
        atLineStart = true;
      } else {
        normalized += character;
      }
      continue;
    }
    if (inString) {
      normalized += character;
      if (character === '\\') {
        normalized += query[index + 1] ?? '';
        index += 1;
      } else if (character === '"') inString = false;
      continue;
    }
    if (inIdentifier) {
      normalized += character;
      if (character === '`' && query[index + 1] === '`') {
        normalized += '`';
        index += 1;
      } else if (character === '`') inIdentifier = false;
      continue;
    }
    if (/\s/.test(character)) {
      if (!atLineStart) pendingWhitespace = normalized.length > 0;
      continue;
    }
    atLineStart = false;
    if (pendingWhitespace) {
      normalized += ' ';
      pendingWhitespace = false;
    }
    if (character === '/' && query[index + 1] === '/') {
      normalized += '//';
      index += 1;
      inLineComment = true;
      continue;
    }
    if (query.slice(index, index + 3) === '"""') {
      normalized += '"""';
      index += 2;
      inTripleString = true;
      continue;
    }
    normalized += character;
    if (character === '"') inString = true;
    if (character === '`') inIdentifier = true;
  }
  return normalized.trim();
};

/** Produces a bounded 16-hex suffix from the full SHA-256 helper for safe semantic placeholder names. */
export const semanticDigest = (value: string): string => sha256Digest(value).slice(0, 16);

/** Calculates the stable SHA-256 identity for a normalized template and its immutable extraction scope. */
export const templateIdentity = (input: TemplateIdentityInput): string => {
  /** Serializes length-delimited components to avoid delimiter ambiguity in the identity preimage. */
  const preimage: string = [
    input.repository,
    input.revision,
    input.signalType,
    normalizeTemplateQuery(input.query),
    input.extractorVersion,
  ]
    .map((component) => `${component.length}:${component}`)
    .join('|');
  return sha256Digest(preimage);
};
