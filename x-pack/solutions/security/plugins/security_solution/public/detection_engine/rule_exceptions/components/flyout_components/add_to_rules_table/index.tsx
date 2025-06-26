/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Search } from '@elastic/eui';
import { EuiSkeletonText, EuiSpacer, EuiPanel, EuiText, EuiInMemoryTable } from '@elastic/eui';
import { useAddToRulesTable } from './use_add_to_rules_table';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';

interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: RuleResponse[];
  onRuleSelectionChange: (rulesSelectedToAdd: RuleResponse[]) => void;
}

const ExceptionsAddToRulesTableComponent: React.FC<ExceptionsAddToRulesComponentProps> = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}) => {
  const {
    isLoading,

    searchOptions,
    pagination,
    sortedRulesByLinkedRulesOnTop,
    rulesTableColumnsWithLinkSwitch,
    onTableChange,
    addToSelectedRulesDescription,
  } = useAddToRulesTable({
    initiallySelectedRules,
    onRuleSelectionChange,
  });
  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{addToSelectedRulesDescription}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<RuleResponse>
          tableLayout="auto"
          search={searchOptions as Search}
          data-test-subj="addExceptionToRulesTable"
          tableCaption="Rules table"
          items={sortedRulesByLinkedRulesOnTop}
          loading={isLoading}
          columns={rulesTableColumnsWithLinkSwitch}
          message={
            isLoading ? (
              <EuiSkeletonText lines={4} data-test-subj="exceptionItemViewerEmptyPromptsLoading" />
            ) : undefined
          }
          pagination={pagination}
          onTableChange={onTableChange}
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
