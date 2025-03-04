/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiSkeletonLoading,
  EuiProgress,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { RulesChangelogLink } from '../rules_changelog_link';
import { AddPrebuiltRulesTableNoItemsMessage } from './add_prebuilt_rules_no_items_message';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { AddPrebuiltRulesTableFilters } from './add_prebuilt_rules_table_filters';
import { useAddPrebuiltRulesTableColumns } from './use_add_prebuilt_rules_table_columns';

/**
 * Table Component for displaying new rules that are available to be installed
 */
export const AddPrebuiltRulesTable = React.memo(() => {
  const addRulesTableContext = useAddPrebuiltRulesTableContext();

  const {
    state: {
      rules,
      hasRulesToInstall,
      isLoading,
      isRefetching,
      selectedRules,
      isUpgradingSecurityPackages,
    },
    actions: { selectRules },
  } = addRulesTableContext;
  const rulesColumns = useAddPrebuiltRulesTableColumns();

  const shouldShowProgress = isUpgradingSecurityPackages || isRefetching;

  const [pageIndex, setPageIndex] = useState(0);
  const handleTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<RuleResponse>) => {
      setPageIndex(index);
    },
    [setPageIndex]
  );

  return (
    <>
      {shouldShowProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      <EuiSkeletonLoading
        isLoading={isLoading}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={
          !hasRulesToInstall ? (
            <AddPrebuiltRulesTableNoItemsMessage />
          ) : (
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={false}>
                  <RulesChangelogLink />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AddPrebuiltRulesTableFilters />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiInMemoryTable
                items={rules}
                sorting
                pagination={{
                  initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                  pageIndex,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: selectRules,
                  initialSelected: selectedRules,
                }}
                itemId="rule_id"
                data-test-subj="add-prebuilt-rules-table"
                columns={rulesColumns}
                onTableChange={handleTableChange}
              />
            </>
          )
        }
      />
    </>
  );
});

AddPrebuiltRulesTable.displayName = 'AddPrebuiltRulesTable';
