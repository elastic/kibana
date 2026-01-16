/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { invariant } from '../../../../../common/utils/invariant';
import {
  BulkActionTypeEnum,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import type { CoverageOverviewDashboardState } from './coverage_overview_dashboard_reducer';
import {
  SET_SHOW_EXPANDED_CELLS,
  SET_RULE_SOURCE_FILTER,
  SET_RULE_SEARCH_FILTER,
  createCoverageOverviewDashboardReducer,
} from './coverage_overview_dashboard_reducer';
import type { InstallSpecificRulesRequest } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { usePerformInstallSpecificRules } from '../../../rule_management/logic/prebuilt_rules/use_perform_rule_install';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview_query';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';

export interface CoverageOverviewDashboardActions {
  refetch: () => void;
  setShowExpandedCells: (value: boolean) => void;
  setRuleSourceFilter: (value: CoverageOverviewRuleSource[]) => void;
  setRuleSearchFilter: (value: string) => void;
  enableAllDisabled: (ruleIds: string[]) => Promise<void>;
  installAvailableRules: (ruleIds: string[]) => Promise<void>;
}

export interface CoverageOverviewDashboardContextType {
  state: CoverageOverviewDashboardState;
  actions: CoverageOverviewDashboardActions;
}

export const CoverageOverviewDashboardContext =
  createContext<CoverageOverviewDashboardContextType | null>(null);

interface CoverageOverviewDashboardContextProviderProps {
  children: React.ReactNode;
}

export const initialState: CoverageOverviewDashboardState = {
  showExpandedCells: true,
  filter: {
    source: [CoverageOverviewRuleSource.Prebuilt, CoverageOverviewRuleSource.Custom],
  },
  data: undefined,
  isLoading: false,
};

export const CoverageOverviewDashboardContextProvider = ({
  children,
}: CoverageOverviewDashboardContextProviderProps) => {
  const [state, dispatch] = useReducer(createCoverageOverviewDashboardReducer(), initialState);
  const { data, isLoading, refetch } = useFetchCoverageOverviewQuery(state.filter);
  const { executeBulkAction } = useExecuteBulkAction();
  const { mutateAsync: installSpecificRulesRequest } = usePerformInstallSpecificRules();

  useEffect(() => {
    refetch();
  }, [refetch, state.filter]);

  const setShowExpandedCells = useCallback(
    (value: boolean): void => {
      dispatch({
        type: SET_SHOW_EXPANDED_CELLS,
        value,
      });
    },
    [dispatch]
  );

  const setRuleSourceFilter = useCallback(
    (value: CoverageOverviewRuleSource[]): void => {
      dispatch({
        type: SET_RULE_SOURCE_FILTER,
        value,
      });
    },
    [dispatch]
  );

  const setRuleSearchFilter = useCallback(
    (value: string): void => {
      dispatch({
        type: SET_RULE_SEARCH_FILTER,
        value,
      });
    },
    [dispatch]
  );

  const enableAllDisabled = useCallback(
    async (ruleIds: string[]) => {
      await executeBulkAction({ type: BulkActionTypeEnum.enable, ids: ruleIds });
    },
    [executeBulkAction]
  );

  const installAvailableRules = useCallback(
    async (rules: InstallSpecificRulesRequest['rules']) => {
      await installSpecificRulesRequest({ rules });
    },
    [installSpecificRulesRequest]
  );

  const actions = useMemo(
    () => ({
      refetch,
      setShowExpandedCells,
      setRuleSourceFilter,
      setRuleSearchFilter,
      enableAllDisabled,
      installAvailableRules,
    }),
    [
      refetch,
      setRuleSearchFilter,
      setRuleSourceFilter,
      setShowExpandedCells,
      enableAllDisabled,
      installAvailableRules,
    ]
  );

  const providerValue = useMemo<CoverageOverviewDashboardContextType>(() => {
    return {
      state: { ...state, isLoading, data },
      actions,
    };
  }, [actions, data, isLoading, state]);

  return (
    <CoverageOverviewDashboardContext.Provider value={providerValue}>
      {children}
    </CoverageOverviewDashboardContext.Provider>
  );
};

export const useCoverageOverviewDashboardContext = (): CoverageOverviewDashboardContextType => {
  const dashboardContext = useContext(CoverageOverviewDashboardContext);
  invariant(
    dashboardContext,
    'useCoverageOverviewDashboardContext should be used inside CoverageOverviewDashboardContextProvider'
  );

  return dashboardContext;
};
