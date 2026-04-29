/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useHistory } from 'react-router-dom';

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import { observabilityAlertFeatureIds } from '../../../common';
import { useKibana } from '../../utils/kibana_react';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useRulesTableFilers } from '../../hooks/use_rules_table_filters';

interface RulesTabProps {
  setRefresh: React.Dispatch<React.SetStateAction<Date>>;
  stateRefresh: Date;
}

export function RulesTab({ setRefresh, stateRefresh }: RulesTabProps) {
  const { services } = useKibana();
  const {
    ruleTypeRegistry,
    actionTypeRegistry,
    triggersActionsUi: { getRulesList: RuleList },
  } = useKibana().services;
  const history = useHistory();

  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const {
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
  } = useRulesTableFilers({ urlStateStorage, setRefresh });

  return (
    <>
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
        navigateToEditRuleForm={navigateToEditRuleForm}
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

      {ruleIdToEdit && ruleConditionsFlyoutOpen ? (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          id={ruleIdToEdit}
          onCancel={() => {
            setRuleConditionsFlyoutOpen(false);
            setRuleIdToEdit(null);
          }}
          onSubmit={() => {
            setRuleConditionsFlyoutOpen(false);
            setRuleIdToEdit(null);
          }}
        />
      ) : null}
    </>
  );
}
