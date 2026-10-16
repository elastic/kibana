/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_KEY_PLACEHOLDER, URL_PLACEHOLDER } from '../constants/console_snippets';

export const fillPlaceholders = (snippet: string, url?: string, apiKey?: string): string => {
  let result = snippet;
  if (url) result = result.replaceAll(URL_PLACEHOLDER, url);
  if (apiKey) result = result.replaceAll(API_KEY_PLACEHOLDER, apiKey);
  return result;
};
