/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readability } from '@mozilla/readability';

import { normalizedBodyHtml, parseHtmlDocument } from './html_document';

/** Selects readable article content, falling back to the normalized body. */
export const extractArticleHtml = (rawHtml: string): string => {
  if (typeof rawHtml !== 'string') throw new TypeError('Raw HTML must be a string');
  if (!rawHtml) return rawHtml;

  const document = parseHtmlDocument(rawHtml);
  if (!document) return '';

  let fallback: string;
  try {
    fallback = normalizedBodyHtml(document);
  } catch {
    return '';
  }

  try {
    const article = new Readability(document, {
      charThreshold: 1,
      disableJSONLD: true,
      maxElemsToParse: 100_000,
    }).parse();
    if (!article?.textContent?.trim() || !article.content) return fallback;
    return article.content;
  } catch {
    return fallback;
  }
};
