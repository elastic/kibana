/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { FindRulesSortField } from '../../../../common/api/detection_engine';
import { Loader } from '../../../common/components/loader';
import { hasUserCRUDPermission } from '../../../common/utils/privileges';
import type { EuiBasicTableOnChange } from '../../../detection_engine/common/types';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import { useRuleManagementFilters } from '../../../detection_engine/rule_management/logic/use_rule_management_filters';
import { useIsUpgradingSecurityPackages } from '../../../detection_engine/rule_management/logic/use_upgrade_security_packages';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../../../detection_engine/rule_management_ui/components/rules_table/constants';
import { useRulesTableContext } from '../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';
import {
  INDEXING_DURATION_COLUMN,
  LAST_EXECUTION_COLUMN,
  RULE_NAME_COLUMN,
  SEARCH_DURATION_COLUMN,
  useEnabledColumn,
  useRuleExecutionStatusColumn,
} from '../../../detection_engine/rule_management_ui/components/rules_table/use_columns';
import { useUserData } from '../../../detections/components/user_info';
import * as i18n from './translations';

const INITIAL_SORT_FIELD = 'name';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

export enum PromotionRuleTabs {
  management = 'management',
  monitoring = 'monitoring',
}

export const PromotionRulesTable = () => {
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();
  const rulesTableContext = useRulesTableContext();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const [currentTab, setCurrentTab] = useState(PromotionRuleTabs.management);

  const {
    state: { rules, isFetched, isRefetching, pagination, sortingOptions },
    actions: { setPage, setPerPage, setSortingOptions },
  } = rulesTableContext;

  const paginationMemo = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: pagination.total,
      pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
    };
  }, [pagination.page, pagination.perPage, pagination.total]);

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      setSortingOptions({
        field: (sort?.field as FindRulesSortField) ?? INITIAL_SORT_FIELD,
        order: sort?.direction ?? 'desc',
      });
      setPage(page.index + 1);
      setPerPage(page.size);
    },
    [setPage, setPerPage, setSortingOptions]
  );

  const rulesColumns = useRulesColumns({ currentTab });

  const handleTabClick = useCallback(
    (tabId: PromotionRuleTabs) => {
      setCurrentTab(tabId);
      rulesTableContext.actions.setPage(1);
      rulesTableContext.actions.setPerPage(pagination.perPage);
      rulesTableContext.actions.setSortingOptions({
        field: INITIAL_SORT_FIELD,
        order: 'desc',
      });
    },
    [pagination.perPage, rulesTableContext.actions]
  );

  const installedTotal =
    (ruleManagementFilters?.rules_summary.custom_count ?? 0) +
    (ruleManagementFilters?.rules_summary.prebuilt_installed_count ?? 0);

  const ruleTabs = useMemo(
    () => [
      {
        id: PromotionRuleTabs.management,
        name: i18n.INSTALLED_RULES_TAB,
        append:
          installedTotal > 0 ? (
            <EuiNotificationBadge size="m" color="subdued">
              {installedTotal}
            </EuiNotificationBadge>
          ) : undefined,
        isSelected: currentTab === PromotionRuleTabs.management,
        onClick: () => handleTabClick(PromotionRuleTabs.management),
      },
      {
        id: PromotionRuleTabs.monitoring,
        name: i18n.RULE_MONITORING_TAB,
        append:
          installedTotal > 0 ? (
            <EuiNotificationBadge size="m" color="subdued">
              {installedTotal}
            </EuiNotificationBadge>
          ) : undefined,
        isSelected: currentTab === PromotionRuleTabs.monitoring,
        onClick: () => handleTabClick(PromotionRuleTabs.monitoring),
      },
    ],
    [currentTab, handleTabClick, installedTotal]
  );

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = !isFetched && isRefetching;

  return (
    <>
      <EuiTabs size="m" bottomBorder>
        {ruleTabs.map((tab) => (
          <EuiTab key={tab.id} {...tab}>
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="s" />
      {shouldShowLinearProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      {shouldShowLoadingOverlay && (
        <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
      )}
      <EuiBasicTable
        itemId="id"
        items={rules}
        noItemsMessage={NO_ITEMS_MESSAGE}
        onChange={tableOnChangeCallback}
        pagination={paginationMemo}
        sorting={{
          sort: {
            // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation
            field: sortingOptions.field as keyof Rule,
            direction: sortingOptions.order,
          },
        }}
        columns={rulesColumns}
      />
    </>
  );
};

interface ColumnsProps {
  currentTab: PromotionRuleTabs;
}

const useRulesColumns = ({ currentTab }: ColumnsProps): Array<EuiBasicTableColumn<Rule>> => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);

  const enabledColumn = useEnabledColumn({
    hasCRUDPermissions: hasPermissions,
    isLoadingJobs: false,
    mlJobs: [],
    startMlJobs: async (jobIds: string[] | undefined) => {},
  });
  const executionStatusColumn = useRuleExecutionStatusColumn({
    sortable: true,
    width: '16%',
    isLoadingJobs: false,
    mlJobs: [],
  });

  return useMemo(() => {
    if (currentTab === PromotionRuleTabs.monitoring) {
      return [
        {
          ...RULE_NAME_COLUMN,
          render: (value: Rule['name']) => <EuiText size="s">{value}</EuiText>,
          width: '38%',
        } as EuiBasicTableColumn<Rule>,
        INDEXING_DURATION_COLUMN,
        SEARCH_DURATION_COLUMN,
        LAST_EXECUTION_COLUMN,
        executionStatusColumn,
        enabledColumn,
      ];
    }

    return [
      {
        ...RULE_NAME_COLUMN,
        render: (value: Rule['name']) => <EuiText size="s">{value}</EuiText>,
        width: '100%',
      } as EuiBasicTableColumn<Rule>,
      LAST_EXECUTION_COLUMN,
      executionStatusColumn,
      enabledColumn,
    ];
  }, [currentTab, enabledColumn, executionStatusColumn]);
};
