/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_PAGE_STATE,
  parseRuleLibrariesUrlState,
  toRuleLibrariesUrlState,
} from './rule_libraries_url_state';

describe('toRuleLibrariesUrlState', () => {
  it('needs nothing in the URL when everything is the default', () => {
    expect(toRuleLibrariesUrlState(DEFAULT_PAGE_STATE)).toBeNull();
  });

  it('keeps only what is not the default', () => {
    expect(
      toRuleLibrariesUrlState({
        ...DEFAULT_PAGE_STATE,
        libraryId: 'elastic-community',
        search: 'powershell',
        tags: ['OS: Linux'],
        tactics: ['TA0002'],
        pageIndex: 2,
        pageSize: 25,
      })
    ).toEqual({
      library: 'elastic-community',
      search: 'powershell',
      tags: ['OS: Linux'],
      tactics: ['TA0002'],
      page: 3,
      perPage: 25,
    });
  });

  it('keeps the tab only when it is not the rules', () => {
    expect(toRuleLibrariesUrlState({ ...DEFAULT_PAGE_STATE, tab: 'rules' })).toBeNull();
    expect(toRuleLibrariesUrlState({ ...DEFAULT_PAGE_STATE, tab: 'valueLists' })).toEqual({
      tab: 'valueLists',
    });
  });

  it('counts the page from 1, as it is shown', () => {
    expect(toRuleLibrariesUrlState({ ...DEFAULT_PAGE_STATE, pageIndex: 1 })).toEqual({ page: 2 });
  });
});

describe('parseRuleLibrariesUrlState', () => {
  it('gives the defaults for an empty URL or one that is not an object', () => {
    expect(parseRuleLibrariesUrlState(null)).toEqual(DEFAULT_PAGE_STATE);
    expect(parseRuleLibrariesUrlState('library')).toEqual(DEFAULT_PAGE_STATE);
    expect(parseRuleLibrariesUrlState(['a'])).toEqual(DEFAULT_PAGE_STATE);
    expect(parseRuleLibrariesUrlState({})).toEqual(DEFAULT_PAGE_STATE);
  });

  it('reads back what was written', () => {
    const state = {
      libraryId: 'elastic',
      tab: 'exceptionLists' as const,
      search: 'ssh',
      tags: ['Domain: Endpoint', 'OS: Linux'],
      tactics: ['TA0002', 'TA0003'],
      pageIndex: 4,
      pageSize: 50,
    };

    expect(parseRuleLibrariesUrlState(toRuleLibrariesUrlState(state))).toEqual(state);
  });

  it('drops values of the wrong type or that do not fit', () => {
    expect(
      parseRuleLibrariesUrlState({
        library: 42,
        tab: 'settings',
        search: ['a'],
        tags: 'OS: Linux',
        tactics: ['TA0002" or *', 'TA0003'],
        page: 'two',
        perPage: 7,
      })
    ).toEqual({ ...DEFAULT_PAGE_STATE, tactics: ['TA0003'] });
  });

  it('refuses a page that is not a positive whole number within the limit', () => {
    [0, -1, 1.5, 10_001].forEach((page) =>
      expect(parseRuleLibrariesUrlState({ page }).pageIndex).toBe(0)
    );
  });

  it('cuts overlong values and lists', () => {
    const state = parseRuleLibrariesUrlState({
      search: 'a'.repeat(1000),
      tags: Array.from({ length: 50 }, (_, i) => `tag ${i}`),
      library: 'x'.repeat(200),
    });

    expect(state.search).toHaveLength(256);
    expect(state.tags).toHaveLength(20);
    expect(state.libraryId).toBe(DEFAULT_PAGE_STATE.libraryId);
  });
});
