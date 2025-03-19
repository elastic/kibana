/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiProgress,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import * as i18n from '../../../../common/translations';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { UpgradePrebuiltRulesTableButtons } from './upgrade_prebuilt_rules_table_buttons';
import type { UpgradePrebuiltRulesSortingOptions } from './upgrade_prebuilt_rules_table_context';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { UpgradePrebuiltRulesTableFilters } from './upgrade_prebuilt_rules_table_filters';
import { useUpgradePrebuiltRulesTableColumns } from './use_upgrade_prebuilt_rules_table_columns';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_RULES_AVAILABLE_FOR_UPGRADE}</h3>}
    titleSize="s"
    body={i18n.NO_RULES_AVAILABLE_FOR_UPGRADE_BODY}
    data-test-subj="noPrebuiltRulesAvailableForUpgrade"
  />
);

/**
 * Table Component for displaying rules that have available updates
 */
export const UpgradePrebuiltRulesTable = React.memo(() => {
  const {
    state: {
      ruleUpgradeStates,
      hasRulesToUpgrade,
      isLoading,
      isFetching,
      isRefetching,
      isUpgradingSecurityPackages,
      pagination,
      sortingOptions,
    },
    actions: { setPagination, setSortingOptions },
  } = useUpgradePrebuiltRulesTableContext();
  const [selected, setSelected] = useState<RuleUpgradeState[]>([]);

  const rulesColumns = useUpgradePrebuiltRulesTableColumns();
  const shouldShowProgress = isUpgradingSecurityPackages || isRefetching;
  const handleTableChange = useCallback(
    ({ page: { index, size }, sort }: CriteriaWithPagination<RuleUpgradeState>) => {
      setPagination({
        page: index + 1,
        perPage: size,
      });
      if (sort) {
        setSortingOptions({
          field: sort.field as UpgradePrebuiltRulesSortingOptions['field'],
          order: sort.direction,
        });
      }
    },
    [setPagination, setSortingOptions]
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
          !hasRulesToUpgrade ? (
            NO_ITEMS_MESSAGE
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
                  <EuiFlexGroup
                    alignItems="flexStart"
                    gutterSize="s"
                    responsive={false}
                    wrap={true}
                  >
                    <EuiFlexItem grow={true}>
                      <UpgradePrebuiltRulesTableFilters />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <UpgradePrebuiltRulesTableButtons selectedRules={selected} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiBasicTable
                loading={isFetching}
                items={ruleUpgradeStates}
                pagination={{
                  totalItemCount: pagination.total,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                  pageIndex: pagination.page - 1,
                  pageSize: pagination.perPage,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: setSelected,
                  initialSelected: selected,
                }}
                sorting={{
                  sort: {
                    // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation
                    field: sortingOptions.field as keyof RuleUpgradeState,
                    direction: sortingOptions.order,
                  },
                }}
                itemId="rule_id"
                data-test-subj="rules-upgrades-table"
                columns={rulesColumns}
                onChange={handleTableChange}
              />
            </>
          )
        }
      />
    </>
  );
});

UpgradePrebuiltRulesTable.displayName = 'UpgradePrebuiltRulesTable';
