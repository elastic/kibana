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
 * Interim text matcher with the same semantics as Fleet's internal
 * `useLocalSearch` (js-search with a prefix index over `name`, `title` and
 * `description`, keyed by `id`) and the same ordering behavior as Fleet's
 * grid (matches filter the input list, so input order is preserved).
 * Replace with Fleet's `useLocalSearch` once it is exported from
 * `@kbn/fleet-plugin/public`.
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
