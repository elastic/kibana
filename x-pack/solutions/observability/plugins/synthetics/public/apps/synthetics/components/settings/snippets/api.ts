/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnippetData } from './snippets';

const SNIPPETS_LOCAL_STORAGE_KEY = 'synthetics.snippets.repository';

export const getSnippets = () => {
  const snippets = localStorage.getItem(SNIPPETS_LOCAL_STORAGE_KEY);
  return (snippets ? JSON.parse(snippets) : []) as SnippetData[];
};

export const saveSnippets = (snippets: SnippetData[]) => {
  localStorage.setItem(SNIPPETS_LOCAL_STORAGE_KEY, JSON.stringify(snippets));
};
