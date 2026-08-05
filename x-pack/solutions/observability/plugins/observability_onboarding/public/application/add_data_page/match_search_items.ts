/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search as LocalSearch, PrefixIndexStrategy } from 'js-search';

export interface SearchableItem {
  id: string;
  name: string;
  title: string;
  description?: string;
}

export type SearchItemsMatcher = <TItem extends SearchableItem>(
  items: TItem[],
  searchTerm: string
) => TItem[];

const FIELDS_TO_SEARCH = ['name', 'title', 'description'];

/**
 * Mirrors Fleet's non-exported `useLocalSearch` (prefix index over `name`,
 * `title`, `description`, input order kept). Drop once Fleet exports it.
 */
export const matchSearchItems: SearchItemsMatcher = (items, searchTerm) => {
  const term = searchTerm.trim();
  if (!term) return items;

  const localSearch = new LocalSearch('id');
  localSearch.indexStrategy = new PrefixIndexStrategy();
  FIELDS_TO_SEARCH.forEach((field) => localSearch.addIndex(field));
  localSearch.addDocuments([...items]);

  const matchedIds = new Set((localSearch.search(term) as SearchableItem[]).map(({ id }) => id));

  return items.filter(({ id }) => matchedIds.has(id));
};
