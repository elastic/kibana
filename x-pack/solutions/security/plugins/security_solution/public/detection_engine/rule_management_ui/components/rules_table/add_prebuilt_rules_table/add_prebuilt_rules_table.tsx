/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiSkeletonLoading,
  EuiProgress,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import type { PrebuiltRuleAssetsSortField } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import * as i18n from '../../../pages/add_rules/translations';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { AddPrebuiltRulesTableNoItemsMessage } from './add_prebuilt_rules_no_items_message';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { AddPrebuiltRulesTableFilters } from './add_prebuilt_rules_table_filters';
import { useAddPrebuiltRulesTableColumns } from './use_add_prebuilt_rules_table_columns';

/**
 * Table Component for displaying new rules that are available to be installed
 */
export const AddPrebuiltRulesTable = React.memo(() => {
  const {
    state: {
      rules,
      hasRulesToInstall,
      isLoading,
      isFetching,
      isRefetching,
      selectedRules,
      isUpgradingSecurityPackages,
      pagination,
      sortingOptions,
    },
    actions: { setPagination, setSortingOptions, selectRules },
  } = useAddPrebuiltRulesTableContext();

  const rulesColumns = useAddPrebuiltRulesTableColumns();

  const shouldShowProgress = isUpgradingSecurityPackages || isRefetching;

  const handleTableChange = useCallback(
    ({ page: { index, size }, sort }: CriteriaWithPagination<RuleResponse>) => {
      setPagination({
        page: index + 1,
        perPage: size,
      });

      if (sort) {
        setSortingOptions({
          field: sort.field as PrebuiltRuleAssetsSortField,
          order: sort.direction,
        });
      }
    },
    [setPagination, setSortingOptions]
  );

  const sortingTableProp = useMemo(() => {
    return sortingOptions
      ? {
          sort: {
            field: sortingOptions.field,
            direction: sortingOptions.order,
          },
        }
      : {};
  }, [sortingOptions]);

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
                {/*
                TODO: The rules changelog link is not yet available for v9. Uncomment this when it is available.
                Issue to uncomment: https://github.com/elastic/kibana/issues/213709
                <EuiFlexItem grow={false} css={{ alignSelf: 'start' }}>
                  <RulesChangelogLink />
                </EuiFlexItem>
                */}
                <EuiFlexItem grow={false}>
                  <AddPrebuiltRulesTableFilters />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiBasicTable
                loading={isFetching}
                items={rules}
                pagination={{
                  totalItemCount: pagination.total,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                  pageIndex: pagination.page - 1,
                  pageSize: pagination.perPage,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: selectRules,
                  initialSelected: selectedRules,
                }}
                sorting={sortingTableProp}
                itemId="rule_id"
                data-test-subj="add-prebuilt-rules-table"
                columns={rulesColumns}
                onChange={handleTableChange}
                tableCaption={i18n.PAGE_TITLE}
              />
            </>
          )
        }
      />
    </>
  );
});

AddPrebuiltRulesTable.displayName = 'AddPrebuiltRulesTable';
