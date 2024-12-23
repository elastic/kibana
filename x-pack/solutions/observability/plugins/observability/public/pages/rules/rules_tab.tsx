/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { useHistory } from 'react-router-dom';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../common/constants';
import { observabilityAlertFeatureIds } from '../../../common';
import { useKibana } from '../../utils/kibana_react';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';

interface RulesTabProps {
  setRefresh: React.Dispatch<React.SetStateAction<Date>>;
  stateRefresh: Date;
}

export function RulesTab({ setRefresh, stateRefresh }: RulesTabProps) {
  const {
    triggersActionsUi: { getRulesList: RuleList },
  } = useKibana().services;
  const history = useHistory();

  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const filteredRuleTypes = useGetFilteredRuleTypes();

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

  return (
    <RuleList
      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
      consumers={observabilityAlertFeatureIds}
      filteredRuleTypes={filteredRuleTypes}
      lastRunOutcomeFilter={stateLastResponse}
      refresh={stateRefresh}
      ruleDetailsRoute="alerts/rules/:ruleId"
      rulesListKey="observability_rulesListColumns"
      ruleParamFilter={stateParams}
      showActionFilter={false}
      statusFilter={stateStatus}
      searchFilter={stateSearch}
      typeFilter={stateType}
      visibleColumns={[
        'ruleName',
        'ruleExecutionStatusLastDate',
        'ruleSnoozeNotify',
        'ruleExecutionStatus',
        'ruleExecutionState',
      ]}
      onLastRunOutcomeFilterChange={handleLastRunOutcomeFilterChange}
      onRuleParamFilterChange={handleRuleParamFilterChange}
      onSearchFilterChange={handleSearchFilterChange}
      onStatusFilterChange={handleStatusFilterChange}
      onTypeFilterChange={handleTypeFilterChange}
      initialSelectedConsumer={AlertConsumers.LOGS}
    />
  );
}
