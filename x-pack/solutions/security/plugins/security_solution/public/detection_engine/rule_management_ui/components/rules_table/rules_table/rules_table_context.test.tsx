/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import type { Rule, RulesSnoozeSettingsMap } from '../../../../rule_management/logic';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import { useFetchRulesSnoozeSettingsQuery } from '../../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query';
import { useGetGapsSummaryByRuleIds } from '../../../../rule_gaps/api/hooks/use_get_gaps_summary_by_rule_id';
import type { RulesTableState } from './rules_table_context';
import { RulesTableContextProvider, useRulesTableContext } from './rules_table_context';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import { RuleSource } from './rules_table_saved_state';
import { useRulesTableSavedState } from './use_rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../rule_management/logic/use_find_rules');
jest.mock('../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review');
jest.mock('../../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query');
jest.mock('../../../../rule_gaps/api/hooks/use_get_gaps_summary_by_rule_id');
jest.mock('./use_rules_table_saved_state');

function renderUseRulesTableContext({
  rules,
  rulesSnoozeSettings,
  savedState,
}: {
  rules?: Rule[] | Error;
  rulesSnoozeSettings?: RulesSnoozeSettingsMap | Error;
  savedState?: ReturnType<typeof useRulesTableSavedState>;
}): RulesTableState {
  (useFindRules as jest.Mock).mockReturnValue({
    data: rules instanceof Error || !rules ? undefined : { rules, total: rules?.length },
    refetch: jest.fn(),
    dataUpdatedAt: 0,
    isFetched: !!rules,
    isFetching: !rules,
    isLoading: !rules,
    isRefetching: false,
    isError: rules instanceof Error,
  });
  (useFetchRulesSnoozeSettingsQuery as jest.Mock).mockReturnValue({
    data: rulesSnoozeSettings instanceof Error ? undefined : rulesSnoozeSettings,
    isError: rulesSnoozeSettings instanceof Error,
  });
  (useGetGapsSummaryByRuleIds as jest.Mock).mockReturnValue({
    data: [],
    isError: false,
  });
  (useUiSetting$ as jest.Mock).mockReturnValue([{ on: false, value: 0, idleTimeout: 0 }]);
  (useRulesTableSavedState as jest.Mock).mockReturnValue(
    savedState ?? {
      filter: {
        searchTerm: undefined,
        source: undefined,
        tags: undefined,
        enabled: undefined,
      },
      sorting: {
        field: undefined,
        order: undefined,
      },
      pagination: {
        page: undefined,
        perPage: undefined,
      },
    }
  );

  const wrapper = ({ children }: PropsWithChildren<{}>) => (
    <RulesTableContextProvider>{children}</RulesTableContextProvider>
  );
  const {
    result: {
      current: { state },
    },
  } = renderHook(() => useRulesTableContext(), { wrapper });

  return state;
}

describe('RulesTableContextProvider', () => {
  describe('persisted state', () => {
    it('restores persisted rules table state', () => {
      const state = renderUseRulesTableContext({
        rules: [],
        savedState: {
          filter: {
            searchTerm: 'test',
            source: RuleSource.Custom,
            tags: ['test'],
            enabled: true,
          },
          sorting: {
            field: 'name',
            order: 'asc',
          },
          pagination: {
            page: 2,
            perPage: 10,
          },
        },
      });

      expect(state.filterOptions).toEqual({
        filter: 'test',
        tags: ['test'],
        showCustomRules: true,
        showElasticRules: false,
        enabled: true,
        gapSearchRange: 'last_24_h',
        showRulesWithGaps: false,
      });
      expect(state.sortingOptions).toEqual({
        field: 'name',
        order: 'asc',
      });
      expect(state.pagination).toEqual({
        page: 2,
        perPage: 10,
        total: 0,
      });
      expect(state.isDefault).toBeFalsy();
    });

    it('restores default rules table state', () => {
      const state = renderUseRulesTableContext({});

      expect(state.filterOptions).toEqual({
        filter: DEFAULT_FILTER_OPTIONS.filter,
        tags: DEFAULT_FILTER_OPTIONS.tags,
        showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
        showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
        gapSearchRange: 'last_24_h',
        showRulesWithGaps: false,
      });
      expect(state.sortingOptions).toEqual({
        field: DEFAULT_SORTING_OPTIONS.field,
        order: DEFAULT_SORTING_OPTIONS.order,
      });
      expect(state.pagination).toEqual({
        page: DEFAULT_PAGE,
        perPage: DEFAULT_RULES_PER_PAGE,
        total: 0,
      });
      expect(state.isDefault).toBeTruthy();
    });
  });

  describe('state', () => {
    describe('rules', () => {
      it('returns an empty array while loading', () => {
        const state = renderUseRulesTableContext({
          rules: undefined,
        });

        expect(state.rules).toEqual([]);
      });

      it('returns an empty array upon error', () => {
        const state = renderUseRulesTableContext({
          rules: new Error('some error'),
        });

        expect(state.rules).toEqual([]);
      });

      it('returns rules while snooze settings are not loaded yet', () => {
        const state = renderUseRulesTableContext({
          rules: [{ name: 'rule 1' }, { name: 'rule 2' }] as Rule[],
          rulesSnoozeSettings: undefined,
        });

        expect(state.rules).toEqual([{ name: 'rule 1' }, { name: 'rule 2' }]);
      });

      it('returns rules even if snooze settings failed to be loaded', () => {
        const state = renderUseRulesTableContext({
          rules: [{ name: 'rule 1' }, { name: 'rule 2' }] as Rule[],
          rulesSnoozeSettings: new Error('some error'),
        });

        expect(state.rules).toEqual([{ name: 'rule 1' }, { name: 'rule 2' }]);
      });

      it('returns rules after snooze settings loaded', () => {
        const state = renderUseRulesTableContext({
          rules: [
            { id: '1', name: 'rule 1' },
            { id: '2', name: 'rule 2' },
          ] as Rule[],
          rulesSnoozeSettings: {
            '1': { muteAll: true, snoozeSchedule: [], name: 'rule 1' },
            '2': { muteAll: false, snoozeSchedule: [], name: 'rule 2' },
          },
        });

        expect(state.rules).toEqual([
          {
            id: '1',
            name: 'rule 1',
          },
          {
            id: '2',
            name: 'rule 2',
          },
        ]);
      });
    });

    describe('rules snooze settings', () => {
      it('returns snooze settings', () => {
        const state = renderUseRulesTableContext({
          rules: [
            { id: '1', name: 'rule 1' },
            { id: '2', name: 'rule 2' },
          ] as Rule[],
          rulesSnoozeSettings: {
            '1': { muteAll: true, snoozeSchedule: [], name: 'rule 1' },
            '2': { muteAll: false, snoozeSchedule: [], name: 'rule 2' },
          },
        });

        expect(state.rulesSnoozeSettings.data).toEqual({
          '1': {
            muteAll: true,
            name: 'rule 1',
            snoozeSchedule: [],
          },
          '2': {
            muteAll: false,
            name: 'rule 2',
            snoozeSchedule: [],
          },
        });
      });
    });
  });
});
