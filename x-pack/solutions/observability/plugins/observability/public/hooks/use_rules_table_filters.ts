/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';
import { useState } from 'react';

export interface UseRulesTableFilterParams {
  urlStateStorage: IKbnUrlStateStorage;
  setRefresh: React.Dispatch<React.SetStateAction<Date>>;
}
export const useRulesTableFilers = ({ urlStateStorage, setRefresh }: UseRulesTableFilterParams) => {
  const { lastResponse, params, search, status, type } = urlStateStorage.get<{
    lastResponse: string[];
    params: Record<string, string | number | object>;
    search: string;
    status: RuleStatus[];
    type: string[];
  }>('_a') || { lastResponse: [], params: {}, search: '', status: [], type: [] };
  const [stateLastResponse, setLastResponse] = useState<string[]>(lastResponse);
  const [stateParams, setParams] = useState<Record<string, string | number | object>>(params);
  const [stateSearch, setSearch] = useState<string>(search);
  const [stateStatus, setStatus] = useState<RuleStatus[]>(status);
  const [stateType, setType] = useState<string[]>(type);
  const [ruleConditionsFlyoutOpen, setRuleConditionsFlyoutOpen] = useState<boolean>(false);
  const [ruleIdToEdit, setRuleIdToEdit] = useState<string | null>();

  const handleStatusFilterChange = (newStatus: RuleStatus[]) => {
    setStatus(newStatus);
    urlStateStorage.set('_a', { lastResponse, params, search, status: newStatus, type });
  };

  const handleLastRunOutcomeFilterChange = (newLastResponse: string[]) => {
    setRefresh(new Date());
    setLastResponse(newLastResponse);
    urlStateStorage.set('_a', { lastResponse: newLastResponse, params, search, status, type });
  };

  const handleTypeFilterChange = (newType: string[]) => {
    setType(newType);
    urlStateStorage.set('_a', { lastResponse, params, search, status, type: newType });
  };

  const handleSearchFilterChange = (newSearch: string) => {
    setSearch(newSearch);
    urlStateStorage.set('_a', { lastResponse, params, search: newSearch, status, type });
  };

  const handleRuleParamFilterChange = (newParams: Record<string, string | number | object>) => {
    setParams(newParams);
    urlStateStorage.set('_a', { lastResponse, params: newParams, search, status, type });
  };

  const navigateToEditRuleForm = (ruleId: string) => {
    setRuleIdToEdit(ruleId);
    setRuleConditionsFlyoutOpen(true);
  };

  return {
    stateLastResponse,
    stateParams,
    stateSearch,
    stateStatus,
    stateType,
    ruleConditionsFlyoutOpen,
    ruleIdToEdit,

    handleStatusFilterChange,
    handleLastRunOutcomeFilterChange,
    handleTypeFilterChange,
    handleSearchFilterChange,
    handleRuleParamFilterChange,
    setRuleIdToEdit,
    navigateToEditRuleForm,
    setRuleConditionsFlyoutOpen,
  };
};
