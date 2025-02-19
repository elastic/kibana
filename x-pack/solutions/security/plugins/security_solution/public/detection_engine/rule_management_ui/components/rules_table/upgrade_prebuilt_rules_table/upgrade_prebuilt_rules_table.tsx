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
  EuiInMemoryTable,
  EuiProgress,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { RulesChangelogLink } from '../rules_changelog_link';
import { UpgradePrebuiltRulesTableButtons } from './upgrade_prebuilt_rules_table_buttons';
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
      isRefetching,
      isUpgradingSecurityPackages,
    },
  } = useUpgradePrebuiltRulesTableContext();
  const [selected, setSelected] = useState<RuleUpgradeState[]>([]);

  const rulesColumns = useUpgradePrebuiltRulesTableColumns();
  const shouldShowProgress = isUpgradingSecurityPackages || isRefetching;
  const [pageIndex, setPageIndex] = useState(0);
  const handleTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<RuleUpgradeState>) => {
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
          !hasRulesToUpgrade ? (
            NO_ITEMS_MESSAGE
          ) : (
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem grow={false}>
                  <RulesChangelogLink />
                </EuiFlexItem>
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

              <EuiInMemoryTable
                items={ruleUpgradeStates}
                sorting
                pagination={{
                  initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                  pageIndex,
                }}
                selection={{
                  selectable: () => true,
                  onSelectionChange: setSelected,
                  initialSelected: selected,
                }}
                itemId="rule_id"
                data-test-subj="rules-upgrades-table"
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

UpgradePrebuiltRulesTable.displayName = 'UpgradePrebuiltRulesTable';
