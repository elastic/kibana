/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cuts the text to `maxLength` UTF-16 code units. A cut that would leave half of a surrogate pair
 * drops that half, so the kept text is always valid when it is encoded.
 */
export const cutText = (text: string, maxLength: number): { text: string; cut: boolean } => {
  if (text.length <= maxLength) {
    return { text, cut: false };
  }
  const kept = text.slice(0, maxLength);
  const lastUnit = kept.charCodeAt(kept.length - 1);
  const splitsPair = lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  return { text: splitsPair ? kept.slice(0, -1) : kept, cut: true };
};
