/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Bidi marks, embeddings, overrides and isolates, which can make text display as something it is not. */
const BIDI_CONTROLS: ReadonlySet<number> = new Set([
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
]);

const isUnsafe = (codePoint: number): boolean =>
  codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) || BIDI_CONTROLS.has(codePoint);

/**
 * Removes C0 and C1 control characters, DEL, and bidi controls from a value taken from an
 * alert, then trims it.
 */
export const stripUnsafeCharacters = (value: string): string =>
  [...value]
    .filter((character) => !isUnsafe(character.codePointAt(0) ?? 0))
    .join('')
    .trim();
