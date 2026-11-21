/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_LIBRARIES_ID } from './components/libraries_list';
import type { LibraryTab } from './components/library_tabs';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants';

const MAX_LIBRARY_ID_LENGTH = 128;
const MAX_SEARCH_LENGTH = 256;
const MAX_TAG_LENGTH = 256;
const MAX_FILTER_VALUES = 20;
const MAX_PAGE = 10_000;
const TACTIC_ID_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;
const TABS_IN_URL: readonly LibraryTab[] = ['exceptionLists', 'valueLists'];

// What the page keeps in the URL. A value that is the default is left out, so the plain page has a plain URL.
export interface RuleLibrariesUrlState {
  library?: string;
  tab?: Exclude<LibraryTab, 'rules'>;
  search?: string;
  tags?: string[];
  tactics?: string[];
  // Counts from 1, as it is shown.
  page?: number;
  perPage?: number;
}

export interface RuleLibrariesPageState {
  libraryId: string;
  tab: LibraryTab;
  search: string;
  tags: string[];
  tactics: string[];
  pageIndex: number;
  pageSize: number;
}

export const DEFAULT_PAGE_STATE: RuleLibrariesPageState = {
  libraryId: ALL_LIBRARIES_ID,
  tab: 'rules',
  search: '',
  tags: [],
  tactics: [],
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const strings = (value: unknown, isValid: (item: string) => boolean): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && isValid(item))
        .slice(0, MAX_FILTER_VALUES)
    : [];

/**
 * The state the URL asks for. The URL can be edited by hand or come from an old link, so every value is checked
 * and the ones that do not fit are dropped.
 */
export const parseRuleLibrariesUrlState = (value: unknown): RuleLibrariesPageState => {
  if (!isRecord(value)) {
    return DEFAULT_PAGE_STATE;
  }

  const { library, tab, search, tags, tactics, page, perPage } = value;

  return {
    libraryId:
      typeof library === 'string' && library.length > 0 && library.length <= MAX_LIBRARY_ID_LENGTH
        ? library
        : ALL_LIBRARIES_ID,
    tab: TABS_IN_URL.find((candidate) => candidate === tab) ?? 'rules',
    search: typeof search === 'string' ? search.slice(0, MAX_SEARCH_LENGTH) : '',
    tags: strings(tags, (tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH),
    tactics: strings(tactics, (tactic) => TACTIC_ID_PATTERN.test(tactic)),
    pageIndex:
      typeof page === 'number' && Number.isInteger(page) && page >= 1 && page <= MAX_PAGE
        ? page - 1
        : 0,
    pageSize:
      typeof perPage === 'number' && PAGE_SIZE_OPTIONS.includes(perPage)
        ? perPage
        : DEFAULT_PAGE_SIZE,
  };
};

// The state to put in the URL, or null when it is all defaults and the URL needs nothing.
export const toRuleLibrariesUrlState = ({
  libraryId,
  tab,
  search,
  tags,
  tactics,
  pageIndex,
  pageSize,
}: RuleLibrariesPageState): RuleLibrariesUrlState | null => {
  const urlState: RuleLibrariesUrlState = {
    ...(libraryId !== ALL_LIBRARIES_ID ? { library: libraryId } : {}),
    ...(tab !== 'rules' ? { tab } : {}),
    ...(search ? { search } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(tactics.length > 0 ? { tactics } : {}),
    ...(pageIndex > 0 ? { page: pageIndex + 1 } : {}),
    ...(pageSize !== DEFAULT_PAGE_SIZE ? { perPage: pageSize } : {}),
  };

  return Object.keys(urlState).length > 0 ? urlState : null;
};
