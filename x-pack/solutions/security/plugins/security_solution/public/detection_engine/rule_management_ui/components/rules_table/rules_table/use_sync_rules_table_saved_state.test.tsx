/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContextMock } from './__mocks__/rules_table_context';
import {
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import type { RulesTableState } from './rules_table_context';
import { useRulesTableContext } from './rules_table_context';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import { RuleSource } from './rules_table_saved_state';
import { useSyncRulesTableSavedState } from './use_sync_rules_table_saved_state';
import { omit } from 'lodash';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string/helpers', () => ({
  useReplaceUrlParams: jest.fn(),
  encodeRisonUrlState: jest.fn().mockImplementation((value) => value),
}));
jest.mock('./rules_table_context');

describe('useSyncRulesTableSavedState', () => {
  const defaultState = {
    filterOptions: DEFAULT_FILTER_OPTIONS,
    sortingOptions: DEFAULT_SORTING_OPTIONS,
    pagination: {
      page: DEFAULT_PAGE,
      perPage: DEFAULT_RULES_PER_PAGE,
      total: 100,
    },
  };

  const expectStateToSyncWithUrl = (
    rulesTableState: Partial<RulesTableState>,
    expectedUrlState: RulesTableUrlSavedState
  ) => {
    const rulesTableContext = useRulesTableContextMock.create();
    rulesTableContext.state = { ...rulesTableContext.state, ...rulesTableState };
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith({
      [URL_PARAM_KEY.rulesTable]: expectedUrlState,
    });
  };

  const expectStateToSyncWithStorage = (
    rulesTableState: Partial<RulesTableState>,
    expectedStorageState: RulesTableStorageSavedState
  ) => {
    const rulesTableContext = useRulesTableContextMock.create();
    rulesTableContext.state = { ...rulesTableContext.state, ...rulesTableState };
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);

    renderHook(() => useSyncRulesTableSavedState());

    expect(setStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY, expectedStorageState);
  };

  let replaceUrlParams: jest.Mock;
  let setStorage: jest.Mock;
  let removeStorage: jest.Mock;

  beforeEach(() => {
    replaceUrlParams = jest.fn();
    setStorage = jest.fn();
    removeStorage = jest.fn();

    (useReplaceUrlParams as jest.Mock).mockReturnValue(replaceUrlParams);
    (useKibana as jest.Mock).mockReturnValue({
      services: { sessionStorage: { set: setStorage, remove: removeStorage } },
    });
  });

  it('clears the default state when there is nothing to sync', () => {
    (useRulesTableContext as jest.Mock).mockReturnValue({ state: defaultState });

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith({ [URL_PARAM_KEY.rulesTable]: null });
    expect(setStorage).not.toHaveBeenCalled();
    expect(removeStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY);
  });

  it('syncs both the url and the storage', () => {
    const state = {
      filterOptions: {
        filter: 'test',
        tags: ['test'],
        showCustomRules: true,
        showElasticRules: false,
        enabled: true,
      },
      sortingOptions: {
        field: 'name',
        order: 'asc',
      } as const,
      pagination: {
        page: 3,
        perPage: 10,
        total: 100,
      },
    };
    const expectedUrlState: RulesTableUrlSavedState = {
      searchTerm: 'test',
      source: RuleSource.Custom,
      tags: ['test'],
      field: 'name',
      order: 'asc',
      page: 3,
      perPage: 10,
      enabled: true,
    };
    const expectedStorageState: RulesTableStorageSavedState = omit(expectedUrlState, 'page');

    const rulesTableContext = useRulesTableContextMock.create();
    rulesTableContext.state = { ...rulesTableContext.state, ...state };
    (useRulesTableContext as jest.Mock).mockReturnValue(rulesTableContext);

    renderHook(() => useSyncRulesTableSavedState());

    expect(replaceUrlParams).toHaveBeenCalledWith({ [URL_PARAM_KEY.rulesTable]: expectedUrlState });
    expect(setStorage).toHaveBeenCalledWith(RULES_TABLE_STATE_STORAGE_KEY, expectedStorageState);
  });

  describe('with the url', () => {
    it('syncs only the search term', () => {
      expectStateToSyncWithUrl(
        { ...defaultState, filterOptions: { ...DEFAULT_FILTER_OPTIONS, filter: 'test' } },
        { searchTerm: 'test' }
      );
    });

    it('syncs only the show elastic rules filter', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showElasticRules: true },
        },
        { source: RuleSource.Prebuilt }
      );
    });

    it('syncs only the show custom rules filter', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showCustomRules: true },
        },
        { source: RuleSource.Custom }
      );
    });

    it('syncs only the tags', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, tags: ['test'] },
        },
        { tags: ['test'] }
      );
    });

    it('syncs only the enabled state filter', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, enabled: true },
        },
        { enabled: true }
      );
    });

    it('syncs only the sorting field', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, field: 'name' },
        },
        { field: 'name' }
      );
    });

    it('syncs only the sorting order', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, order: 'asc' },
        },
        { order: 'asc' }
      );
    });

    it('syncs only the page number', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            page: 10,
          },
        },
        { page: 10 }
      );
    });

    it('syncs only the page size', () => {
      expectStateToSyncWithUrl(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            perPage: 10,
          },
        },
        { perPage: 10 }
      );
    });
  });

  describe('with the storage', () => {
    it('syncs only the search term', () => {
      expectStateToSyncWithStorage(
        { ...defaultState, filterOptions: { ...defaultState.filterOptions, filter: 'test' } },
        { searchTerm: 'test' }
      );
    });

    it('syncs only the show elastic rules filter', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showElasticRules: true },
        },
        { source: RuleSource.Prebuilt }
      );
    });

    it('syncs only the show custom rules filter', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, showCustomRules: true },
        },
        { source: RuleSource.Custom }
      );
    });

    it('syncs only the tags', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, tags: ['test'] },
        },
        { tags: ['test'] }
      );
    });

    it('syncs only the enabled state filter', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          filterOptions: { ...defaultState.filterOptions, enabled: true },
        },
        { enabled: true }
      );
    });

    it('syncs only the sorting field', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, field: 'name' },
        },
        { field: 'name' }
      );
    });

    it('syncs only the sorting order', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          sortingOptions: { ...defaultState.sortingOptions, order: 'asc' },
        },
        { order: 'asc' }
      );
    });

    it('does not sync the page number', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            page: 10,
          },
        },
        {}
      );
    });

    it('syncs only the page size', () => {
      expectStateToSyncWithStorage(
        {
          ...defaultState,
          pagination: {
            ...defaultState.pagination,
            perPage: 10,
          },
        },
        { perPage: 10 }
      );
    });
  });
});
