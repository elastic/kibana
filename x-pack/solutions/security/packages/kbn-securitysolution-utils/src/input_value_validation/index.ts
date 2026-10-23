/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NUL only: other control characters (tab, newline) can appear in a real command line or path.
const NULL_CHARACTER = '\u0000';

/** Returns true when a value, or any array member, contains a NUL character. */
export const hasNullCharacter = (value: string | string[]): boolean => {
  const values = Array.isArray(value) ? value : [value];

  return values.some((member) => member.includes(NULL_CHARACTER));
};

/** Trims edge whitespace; array members that become empty are dropped. */
export const trimInputValues = (value: string | string[]): string | string[] => {
  if (Array.isArray(value)) {
    return value.map((member) => member.trim()).filter((member) => member.length > 0);
  }

  return value.trim();
};
