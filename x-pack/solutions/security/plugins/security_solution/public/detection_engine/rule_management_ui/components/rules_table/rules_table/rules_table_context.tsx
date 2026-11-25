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
import { useFetchRulesSnoozeSettingsQuery } from '../../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query';
import { useGetGapsSummaryByRuleIds } from '../../../../rule_gaps/api/hooks/use_get_gaps_summary_by_rule_id';
import {
  DEFAULT_RULES_TABLE_REFRESH_SETTING,
  EXCLUDED_GAP_REASONS_KEY,
} from '../../../../../../common/constants';
import { useGapAutoFillSchedulerContext } from '../../../../rule_gaps/context/gap_auto_fill_scheduler_context';
import { convertRulesFilterToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import {
  liftTagCategories,
  normalizeRuleSetConditions,
} from '../../../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { ruleQueryParams } from '../../../../rule_sets/table_query';
import type { RuleSetLastRunOutcome } from '../../../../../../common/api/detection_engine/rule_sets';
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
import type {
  RuleExecutionStatus,
  WarningSchema,
} from '../../../../../../common/api/detection_engine';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import type { SearchFallbackReason } from '../../../../rule_management/api/hooks/use_find_rules_query';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';
import { RuleSource } from './rules_table_saved_state';
import { useRulesTableSavedState } from './use_rules_table_saved_state';
import { useRulesTableStorageKey } from './use_rules_table_storage_key';
import { defaultRangeValue } from '../../../../rule_gaps/constants';
import { getGapRange } from '../../../../rule_gaps/api/hooks/utils';

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

/** The last response filter of earlier versions as a last run outcome. */
const LEGACY_OUTCOMES: Partial<Record<RuleExecutionStatus, RuleSetLastRunOutcome>> = {
  succeeded: 'succeeded',
  'partial failure': 'warning',
  failed: 'failed',
};

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
  /**
   * Warning, such as when the number of rules with gaps is greater than the limit.
   */
  warnings?: WarningSchema[];
  /** The search mode that ran: `semantic` lists the relevant rules in relevance order. */
  searchMode?: 'legacy' | 'semantic';
  /** Why a search by meaning ran as the keyword search. */
  searchFallbackReason?: SearchFallbackReason;
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
  | 'fill_gaps'
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
  const { scheduler } = useGapAutoFillSchedulerContext();
  const activeSchedulerId = scheduler?.enabled ? scheduler.id : undefined;
  const [autoRefreshSettings] = useUiSetting$<{
    on: boolean;
    value: number;
    idleTimeout: number;
  }>(DEFAULT_RULES_TABLE_REFRESH_SETTING);
  const { sessionStorage, uiSettings } = useKibana().services;
  const storageKey = useRulesTableStorageKey();
  const excludedReasons = uiSettings.get<string[]>(EXCLUDED_GAP_REASONS_KEY);
  const {
    filter: savedFilter,
    sorting: savedSorting,
    pagination: savedPagination,
  } = useRulesTableSavedState();

  // Tags, source, enabled and last response are facets now: a saved table state or a link with
  // the old filters opens with the same rules, shown in the facet panel.
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(() => {
    const outcome = savedFilter?.ruleExecutionStatus
      ? LEGACY_OUTCOMES[savedFilter.ruleExecutionStatus]
      : undefined;
    const conditions = normalizeRuleSetConditions({
      ...(savedFilter?.tags?.length ? { tags: { include: savedFilter.tags, match: 'all' } } : {}),
      ...(savedFilter?.source
        ? {
            rule_source: {
              include: [savedFilter.source === RuleSource.Custom ? 'internal' : 'external'],
            },
          }
        : {}),
      ...(savedFilter?.enabled != null ? { enabled: savedFilter.enabled } : {}),
      ...(outcome ? { last_run_outcome: { include: [outcome] } } : {}),
      ...savedFilter?.conditions,
    });
    return {
      ...DEFAULT_FILTER_OPTIONS,
      filter: savedFilter?.searchTerm ?? DEFAULT_FILTER_OPTIONS.filter,
      searchMode: savedFilter?.searchMode,
      gapFillStatuses: DEFAULT_FILTER_OPTIONS.gapFillStatuses,
      ruleSetId: savedFilter?.ruleSetId,
      groupBy: savedFilter?.groupBy,
      conditions: liftTagCategories(conditions),
    };
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
  const autoRefreshBeforePause = useRef<boolean | null>(null);

  const isActionInProgress = loadingRules.ids.length > 0;

  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const findRulesQueryArgs = useMemo(() => {
    const structuredKql = convertRulesFilterToKQL({ ...filterOptions, filter: '' });

    const shouldApplyGaps = Boolean(filterOptions.gapFillStatuses?.length);
    const gapRange = shouldApplyGaps ? getGapRange(defaultRangeValue) : undefined;

    return {
      ...(structuredKql !== '' ? { filter: { term: structuredKql, mode: 'KQL' as const } } : {}),
      sort_field: sortingOptions.field,
      sort_order: sortingOptions.order,
      pagination,
      ...(shouldApplyGaps ? { gap_fill_statuses: filterOptions.gapFillStatuses } : {}),
      ...(gapRange ? { gaps_range_start: gapRange.start, gaps_range_end: gapRange.end } : {}),
      ...(activeSchedulerId ? { gap_auto_fill_scheduler_id: activeSchedulerId } : {}),
      ...ruleQueryParams(filterOptions),
    };
  }, [filterOptions, sortingOptions, pagination, activeSchedulerId]);

  const handleFilterOptionsChange = useCallback((newFilter: Partial<FilterOptions>) => {
    setFilterOptions((currentFilter) =>
      // Another rule set starts with clear filters: a search or tag from the previous view can
      // hide all rules of the group.
      'ruleSetId' in newFilter && newFilter.ruleSetId !== currentFilter.ruleSetId
        ? { ...DEFAULT_FILTER_OPTIONS, ...newFilter }
        : { ...currentFilter, ...newFilter }
    );
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
    setFilterOptions((current) => ({
      filter: DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
      showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
      tags: DEFAULT_FILTER_OPTIONS.tags,
      enabled: undefined,
      ruleExecutionStatus: DEFAULT_FILTER_OPTIONS.ruleExecutionStatus,
      gapFillStatuses: undefined,
      conditions: undefined,
      // The selected rule set is where the user is, not a filter. Keep it.
      ruleSetId: current.ruleSetId,
      groupBy: current.groupBy,
      searchMode: current.searchMode,
    }));
    setSortingOptions({
      field: DEFAULT_SORTING_OPTIONS.field,
      order: DEFAULT_SORTING_OPTIONS.order,
    });
    setPage(DEFAULT_PAGE);
    setPerPage(DEFAULT_RULES_PER_PAGE);

    replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
    sessionStorage.remove(storageKey);
  }, [
    setFilterOptions,
    setSortingOptions,
    setPage,
    setPerPage,
    replaceUrlParams,
    sessionStorage,
    storageKey,
  ]);

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

  // Fetch rules
  const {
    data: { rules, total, warnings, searchMode, searchFallbackReason } = {
      rules: [],
      total: 0,
      warnings: [],
    },
    refetch,
    dataUpdatedAt,
    isFetched,
    isFetching,
    isLoading,
    isRefetching,
  } = useFindRules(findRulesQueryArgs, {
    // We don't need refreshes on windows focus and reconnects if auto-refresh if off
    refetchOnWindowFocus: isRefreshOn && !isActionInProgress,
    refetchOnReconnect: isRefreshOn && !isActionInProgress,
    refetchInterval: isRefreshOn && !isActionInProgress && autoRefreshSettings.value,
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

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
      gapRange: defaultRangeValue,
      excludedReasons,
      schedulerId: activeSchedulerId,
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
        warnings,
        searchMode,
        searchFallbackReason,
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
    warnings,
    searchMode,
    searchFallbackReason,
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
