/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const truncateTextPreview = (
  text: string,
  maxLength: number
): { preview: string; isTruncated: boolean } => {
  const characters = Array.from(text);
  if (characters.length <= maxLength) {
    return { preview: text, isTruncated: false };
  }

  return { preview: `${characters.slice(0, maxLength).join('')}...`, isTruncated: true };
};
