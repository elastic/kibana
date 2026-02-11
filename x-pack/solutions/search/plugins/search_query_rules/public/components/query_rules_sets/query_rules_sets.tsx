/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';
import { useKibana } from '../../hooks/use_kibana';
import { useQueryRulesSetsTableData } from '../../hooks/use_query_rules_sets_table_data';
import { QueryRulesSetsSearch } from './query_rules_sets_search';
import { DeleteRulesetModal } from './delete_ruleset_modal';
import { UseRunQueryRuleset } from '../../hooks/use_run_query_ruleset';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

export const QueryRulesSets = () => {
  const useTracker = useUsageTracker();
  const {
    services: { application, http },
  } = useKibana();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const [searchKey, setSearchKey] = useState('');
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const { data: queryRulesData } = useFetchQueryRulesSets({ from, size: pageSize });
  const [rulesetToDelete, setRulesetToDelete] = useState<string | null>(null);

  const { queryRulesSetsFilteredData, pagination } = useQueryRulesSetsTableData(
    queryRulesData,
    searchKey,
    pageIndex,
    pageSize
  );

  useEffect(() => {
    useTracker?.load?.(AnalyticsEvents.rulesetListPageLoaded);
  }, [useTracker]);

  if (!queryRulesData) {
    return null;
  }

  const columns: Array<EuiBasicTableColumn<QueryRulesListRulesetsQueryRulesetListItem>> = [
    {
      field: 'ruleset_id',
      name: i18n.translate('xpack.queryRules.queryRulesSetTable.nameColumn', {
        defaultMessage: 'Query Rule Set',
      }),
      render: (name: string) => (
        <EuiLink
          data-test-subj="queryRuleSetName"
          onClick={() => {
            useTracker?.click?.(AnalyticsEvents.editRulesetInlineNameClicked);
            application.navigateToUrl(
              http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${name}`)
            );
          }}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'rule_total_count',
      name: i18n.translate('xpack.queryRules.queryRulesSetTable.ruleCount', {
        defaultMessage: 'Rule Count',
      }),
      render: (ruleCount: number) => (
        <div data-test-subj="queryRuleSetItemRuleCount">{ruleCount}</div>
      ),
    },
    {
      actions: [
        {
          render: (item: QueryRulesListRulesetsQueryRulesetListItem) => {
            return (
              <UseRunQueryRuleset
                rulesetId={item.ruleset_id}
                type="contextMenuItem"
                content={i18n.translate('xpack.queryRules.queryRulesSetTable.actions.run', {
                  defaultMessage: 'Test in Console',
                })}
                onClick={() => {
                  useTracker?.click?.(AnalyticsEvents.testRulesetInlineDropdownClicked);
                }}
              />
            );
          },
        },
        {
          name: i18n.translate('xpack.queryRules.queryRulesSetTable.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: (ruleset: QueryRulesListRulesetsQueryRulesetListItem) =>
            i18n.translate('xpack.queryRules.queryRulesSetTable.actions.editDescription', {
              defaultMessage: 'Edit query ruleset {name}',
              values: { name: ruleset.ruleset_id },
            }),
          icon: 'pencil',
          color: 'text',
          type: 'icon',
          onClick: (ruleset: QueryRulesListRulesetsQueryRulesetListItem) => {
            useTracker?.click?.(AnalyticsEvents.editRulesetInlineDropdownClicked);
            application.navigateToUrl(
              http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${ruleset.ruleset_id}`)
            );
          },
        },
        {
          name: i18n.translate('xpack.queryRules.queryRulesSetTable.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: (ruleset: QueryRulesListRulesetsQueryRulesetListItem) =>
            i18n.translate('xpack.queryRules.queryRulesSetTable.actions.deleteDescription', {
              defaultMessage: 'Delete query ruleset {name}',
              values: { name: ruleset.ruleset_id },
            }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          'data-test-subj': 'queryRulesSetDeleteButton',
          isPrimary: true,
          onClick: (ruleset: QueryRulesListRulesetsQueryRulesetListItem) => {
            useTracker?.click?.(AnalyticsEvents.deleteRulesetInlineDropdownClicked);
            setRulesetToDelete(ruleset.ruleset_id);
          },
        },
      ],
    },
  ];

  return (
    <>
      {rulesetToDelete && (
        <DeleteRulesetModal
          rulesetId={rulesetToDelete}
          closeDeleteModal={() => setRulesetToDelete(null)}
        />
      )}
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <QueryRulesSetsSearch searchKey={searchKey} setSearchKey={setSearchKey} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiBasicTable
            data-test-subj="queryRulesSetTable"
            items={queryRulesSetsFilteredData} // Use filtered data from hook
            columns={columns}
            pagination={pagination}
            tableCaption={i18n.translate('xpack.queryRules.queryRulesSetTable.tableCaption', {
              defaultMessage: 'Query rule sets list',
            })}
            onChange={({ page: changedPage }) => {
              setPageIndex(changedPage.index);
              setPageSize(changedPage.size);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
