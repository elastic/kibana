/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getGapRange } from '../../../../rule_gaps/api/hooks/utils';
import { useFetchRulesSnoozeSettingsQuery } from '../../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query';
import { useGetGapsSummaryByRuleIds } from '../../../../rule_gaps/api/hooks/use_get_gaps_summary_by_rule_id';
import { DEFAULT_RULES_TABLE_REFRESH_SETTING } from '../../../../../../common/constants';
import { invariant } from '../../../../../../common/utils/invariant';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import type {
  FilterOptions,
  PaginationOptions,
  Rule,
  RulesSnoozeSettingsMap,
  SortingOptions,
} from '../../../../rule_management/logic/types';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import { RuleSource } from './rules_table_saved_state';
import { useRulesTableSavedState } from './use_rules_table_saved_state';
import { defaultRangeValue } from '../../../../rule_gaps/constants';

interface RulesSnoozeSettings {
  /**
   * A map object using rule SO's id (not ruleId) as keys and snooze settings as values
   */
  data: RulesSnoozeSettingsMap;
  /**
   * Sets to true during the first data loading
   */
  isLoading: boolean;
  /**
   * Sets to true during data loading
   */
  isFetching: boolean;
  isError: boolean;
}

export interface RulesTableState {
  /**
   * Rules to display (sorted and paginated in case of in-memory)
   */
  rules: Rule[];
  /**
   * Currently selected table filter
   */
  filterOptions: FilterOptions;
  /**
   * Is true whenever a rule action is in progress, such as delete, duplicate, export, or load.
   */
  isActionInProgress: boolean;
  /**
   * Is true whenever all table rules are selected (with respect to the currently selected filters)
   */
  isAllSelected: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a request is in-flight, which includes initial loading as well as background refetches.
   */
  isFetching: boolean;
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Is true when a preflight request (dry-run) is in progress.
   */
  isPreflightInProgress: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * Indicates whether we should refetch table data in the background
   */
  isRefreshOn: boolean;
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * IDs of rules the current table action (enable, disable, delete, etc.) is affecting
   */
  loadingRuleIds: string[];
  /**
   * Indicates which rule action (enable, disable, delete, etc.) is currently in progress
   */
  loadingRulesAction: LoadingRuleAction;
  /**
   * Currently selected page and number of rows per page
   */
  pagination: PaginationOptions;
  /**
   * IDs of rules selected by a user
   */
  selectedRuleIds: string[];
  /**
   * Currently selected table sorting
   */
  sortingOptions: SortingOptions;
  /**
   * Whether the state has its default value
   */
  isDefault: boolean;
  /**
   * Rules snooze settings for the current rules
   */
  rulesSnoozeSettings: RulesSnoozeSettings;
}

export type LoadingRuleAction =
  | 'delete'
  | 'disable'
  | 'duplicate'
  | 'enable'
  | 'export'
  | 'load'
  | 'edit'
  | 'run'
  | null;

export interface LoadingRules {
  ids: string[];
  action: LoadingRuleAction;
}

export interface RulesTableActions {
  reFetchRules: ReturnType<typeof useFindRules>['refetch'];
  setFilterOptions: (newFilter: Partial<FilterOptions>) => void;
  setIsAllSelected: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreflightInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  /**
   * enable/disable rules table auto refresh
   *
   * @example
   *
   * setIsRefreshOn(true) // enables auto refresh
   * setIsRefreshOn(false) // disables auto refresh
   */
  setIsRefreshOn: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingRules: React.Dispatch<React.SetStateAction<LoadingRules>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPerPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedRuleIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSortingOptions: React.Dispatch<React.SetStateAction<SortingOptions>>;
  /**
   * clears rules selection on a page
   */
  clearRulesSelection: () => void;
  /**
   * Clears rules table filters
   */
  clearFilters: () => void;
}

export interface RulesTableContextType {
  state: RulesTableState;
  actions: RulesTableActions;
}

const RulesTableContext = createContext<RulesTableContextType | null>(null);

interface RulesTableContextProviderProps {
  children: React.ReactNode;
}

export const RulesTableContextProvider = ({ children }: RulesTableContextProviderProps) => {
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const { sessionStorage } = useKibana().services;
  const {
    filter: savedFilter,
    sorting: savedSorting,
    pagination: savedPagination,
  } = useRulesTableSavedState();

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    filter: savedFilter?.searchTerm ?? DEFAULT_FILTER_OPTIONS.filter,
    tags: savedFilter?.tags ?? DEFAULT_FILTER_OPTIONS.tags,
    showCustomRules:
      savedFilter?.source === RuleSource.Custom ?? DEFAULT_FILTER_OPTIONS.showCustomRules,
    showElasticRules:
      savedFilter?.source === RuleSource.Prebuilt ?? DEFAULT_FILTER_OPTIONS.showElasticRules,
    enabled: savedFilter?.enabled,
    ruleExecutionStatus:
      savedFilter?.ruleExecutionStatus ?? DEFAULT_FILTER_OPTIONS.ruleExecutionStatus,
    gapSearchRange: DEFAULT_FILTER_OPTIONS.gapSearchRange,
    showRulesWithGaps: false,
  });

  const [sortingOptions, setSortingOptions] = useState<SortingOptions>({
    field: savedSorting?.field ?? DEFAULT_SORTING_OPTIONS.field,
    order: savedSorting?.order ?? DEFAULT_SORTING_OPTIONS.order,
  });

  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isRefreshOn, setIsRefreshOn] = useState(autoRefreshSettings.on);
  const [loadingRules, setLoadingRules] = useState<LoadingRules>({
    ids: [],
    action: null,
  });
  const [isPreflightInProgress, setIsPreflightInProgress] = useState(false);
  const [page, setPage] = useState(savedPagination?.page ?? DEFAULT_PAGE);
  const [perPage, setPerPage] = useState(savedPagination?.perPage ?? DEFAULT_RULES_PER_PAGE);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [gapRangeForSearch, setGapRangeForSearch] = useState<{
    start: string;
    end: string;
  }>();
  const autoRefreshBeforePause = useRef<boolean | null>(null);

  const isActionInProgress = loadingRules.ids.length > 0;

  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    setFilterOptions((currentFilter) => ({ ...currentFilter, ...newFilter }));
    setPage(1);
    setSelectedRuleIds([]);
    setIsAllSelected(false);
  }, []);

  const clearRulesSelection = useCallback(() => {
    setSelectedRuleIds([]);
    setIsAllSelected(false);
  }, []);

  const replaceUrlParams = useReplaceUrlParams();
  const clearFilters = useCallback(() => {
    setFilterOptions({
      filter: DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
      showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
      tags: DEFAULT_FILTER_OPTIONS.tags,
      enabled: undefined,
      ruleExecutionStatus: DEFAULT_FILTER_OPTIONS.ruleExecutionStatus,
    });
    setSortingOptions({
      field: DEFAULT_SORTING_OPTIONS.field,
      order: DEFAULT_SORTING_OPTIONS.order,
    });
    setPage(DEFAULT_PAGE);
    setPerPage(DEFAULT_RULES_PER_PAGE);

    replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
    sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
  }, [setFilterOptions, setSortingOptions, setPage, setPerPage, replaceUrlParams, sessionStorage]);

  useEffect(() => {
    // pause table auto refresh when any of rule selected
    // store current auto refresh value, to use it later, when all rules selection will be cleared
    if (selectedRuleIds.length > 0) {
      setIsRefreshOn(false);
      if (autoRefreshBeforePause.current == null) {
        autoRefreshBeforePause.current = isRefreshOn;
      }
    } else {
      // if no rules selected, update auto refresh value, with previously stored value
      setIsRefreshOn(autoRefreshBeforePause.current ?? isRefreshOn);
      autoRefreshBeforePause.current = null;
    }
  }, [selectedRuleIds, isRefreshOn]);

  useEffect(() => {
    if (filterOptions.showRulesWithGaps) {
      setGapRangeForSearch(getGapRange(filterOptions.gapSearchRange ?? defaultRangeValue));
    } else {
      setGapRangeForSearch(undefined);
    }
  }, [filterOptions.showRulesWithGaps, filterOptions.gapSearchRange]);

  // Fetch rules
  const {
    data: { rules, total } = { rules: [], total: 0 },
    refetch,
    dataUpdatedAt,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
  } = useFindRules(
    {
      filterOptions,
      sortingOptions,
      pagination,
      ...(gapRangeForSearch ? { gapsRange: gapRangeForSearch } : {}),
    },
    {
      // We don't need refreshes on windows focus and reconnects if auto-refresh if off
      refetchOnWindowFocus: isRefreshOn && !isActionInProgress,
      refetchOnReconnect: isRefreshOn && !isActionInProgress,
      refetchInterval: isRefreshOn && !isActionInProgress && autoRefreshSettings.value,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
    }
  );

  // Fetch rules snooze settings
  const {
    data: rulesSnoozeSettingsMap,
    isLoading: isSnoozeSettingsLoading,
    isFetching: isSnoozeSettingsFetching,
    isError: isSnoozeSettingsFetchError,
    refetch: refetchSnoozeSettings,
  } = useFetchRulesSnoozeSettingsQuery(
    rules.map((x) => x.id),
    { enabled: rules.length > 0 }
  );

  const { data: rulesGapInfoByRuleIds, refetch: refetchGapInfo } = useGetGapsSummaryByRuleIds(
    {
      ruleIds: rules.map((x) => x.id),
      gapRange: filterOptions.gapSearchRange ?? defaultRangeValue,
    },
    {
      enabled: rules.length > 0,
    }
  );

  const refetchRulesAndRelatedData = useCallback(async () => {
    const response = await refetch();
    await Promise.allSettled([refetchSnoozeSettings(), refetchGapInfo()]);
    return response;
  }, [refetch, refetchSnoozeSettings, refetchGapInfo]);

  const actions = useMemo(
    () => ({
      reFetchRules: refetchRulesAndRelatedData,
      setFilterOptions: handleFilterOptionsChange,
      setIsAllSelected,
      setIsRefreshOn,
      setLoadingRules,
      setPage,
      setPerPage,
      setSelectedRuleIds,
      setSortingOptions,
      clearRulesSelection,
      setIsPreflightInProgress,
      clearFilters,
    }),
    [
      refetchRulesAndRelatedData,
      handleFilterOptionsChange,
      setIsAllSelected,
      setIsRefreshOn,
      setLoadingRules,
      setPage,
      setPerPage,
      setSelectedRuleIds,
      setSortingOptions,
      clearRulesSelection,
      setIsPreflightInProgress,
      clearFilters,
    ]
  );

  const enrichedRules = useMemo(() => {
    return rules.map((rule) => {
      const gapInfo = rulesGapInfoByRuleIds?.data?.find((x) => x.rule_id === rule.id);
      return {
        ...rule,
        gap_info: gapInfo,
      };
    });
  }, [rules, rulesGapInfoByRuleIds]);

  const providerValue = useMemo(() => {
    return {
      state: {
        rules: enrichedRules,
        rulesSnoozeSettings: {
          data: rulesSnoozeSettingsMap ?? {},
          isLoading: isSnoozeSettingsLoading,
          isFetching: isSnoozeSettingsFetching,
          isError: isSnoozeSettingsFetchError,
        },
        pagination: {
          page,
          perPage,
          total,
        },
        filterOptions,
        isPreflightInProgress,
        isActionInProgress,
        isAllSelected,
        isFetched,
        isFetching,
        isLoading,
        isRefetching,
        isRefreshOn,
        lastUpdated: dataUpdatedAt,
        loadingRuleIds: loadingRules.ids,
        loadingRulesAction: loadingRules.action,
        selectedRuleIds,
        sortingOptions,
        isDefault: isDefaultState(filterOptions, sortingOptions, {
          page,
          perPage,
          total,
        }),
      },
      actions,
    };
  }, [
    enrichedRules,
    rulesSnoozeSettingsMap,
    isSnoozeSettingsLoading,
    isSnoozeSettingsFetching,
    isSnoozeSettingsFetchError,
    page,
    perPage,
    total,
    filterOptions,
    isPreflightInProgress,
    isActionInProgress,
    isAllSelected,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
    isRefreshOn,
    dataUpdatedAt,
    loadingRules.ids,
    loadingRules.action,
    selectedRuleIds,
    sortingOptions,
    actions,
  ]);

  return <RulesTableContext.Provider value={providerValue}>{children}</RulesTableContext.Provider>;
};

export const useRulesTableContext = (): RulesTableContextType => {
  const rulesTableContext = useContext(RulesTableContext);
  invariant(
    rulesTableContext,
    'useRulesTableContext should be used inside RulesTableContextProvider'
  );

  return rulesTableContext;
};

export const useRulesTableContextOptional = (): RulesTableContextType | null =>
  useContext(RulesTableContext);

function isDefaultState(
  filter: FilterOptions,
  sorting: SortingOptions,
  pagination: PaginationOptions
): boolean {
  return (
    isEqual(filter, DEFAULT_FILTER_OPTIONS) &&
    isEqual(sorting, DEFAULT_SORTING_OPTIONS) &&
    pagination.page === DEFAULT_PAGE &&
    pagination.perPage === DEFAULT_RULES_PER_PAGE
  );
}
