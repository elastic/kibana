/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Cuts text to `max` UTF-16 units without splitting a surrogate pair. */
export const truncateText = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const lastCode = text.charCodeAt(max - 1);
  const isHighSurrogate = lastCode >= 0xd800 && lastCode <= 0xdbff;
  return text.slice(0, isHighSurrogate ? max - 1 : max);
};

/** A fresh flat copy, so a short slice of a large parsed text does not keep that text alive. */
export const flatCopy = (text: string): string => Buffer.from(text, 'utf8').toString('utf8');
