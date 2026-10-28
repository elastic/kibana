/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';

// Tags copied from rendered badges land on the clipboard newline-separated, while
// typed lists use commas. Split on both so either source yields one tag per value.
const TAG_DELIMITER = /[\n\r,]+/;
const HAS_TAG_DELIMITER = /[\n\r,]/;

export const hasTagDelimiter = (text: string): boolean => HAS_TAG_DELIMITER.test(text);

export const splitTags = (text: string): string[] => text.split(TAG_DELIMITER);

// Returns the trimmed, non-empty additions from `rawValues` that are not already in
// `existingTags`, de-duplicated case-insensitively both against existing tags and within
// the batch. Original casing of the first occurrence is preserved. Empty when nothing to add.
export const getNewTags = (existingTags: string[], rawValues: string[]): string[] => {
  const seen = new Set(existingTags.map((tag) => tag.trim().toLowerCase()));

  return rawValues
    .map((tag) => tag.trim())
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
};

// The single-line input would collapse a pasted newline/comma list into one tag, so read
// the raw clipboard and split before the input sanitizes it. Returns a handler that no-ops
// (leaving default paste behavior) when the clipboard has no delimiter.
export const createTagsPasteHandler =
  (addTags: (rawValues: string[]) => void) =>
  (e: React.ClipboardEvent<HTMLDivElement>): void => {
    const text = e.clipboardData.getData('text');
    if (!hasTagDelimiter(text)) {
      return;
    }
    e.preventDefault();
    addTags(splitTags(text));
  };
