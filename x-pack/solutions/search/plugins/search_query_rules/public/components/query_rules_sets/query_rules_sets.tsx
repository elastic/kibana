/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';
import { EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';

export const QueryRulesSets = () => {
  const {
    services: { application, http },
  } = useKibana();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const { data: queryRulesData } = useFetchQueryRulesSets({ from, size: pageSize });

  if (!queryRulesData) {
    return null;
  }

  const pagination = {
    initialPageSize: 25,
    pageSizeOptions: [10, 25, 50],
    ...queryRulesData._meta,
    pageSize,
    pageIndex,
  };
  const columns: Array<EuiBasicTableColumn<QueryRulesListRulesetsQueryRulesetListItem>> = [
    {
      field: 'ruleset_id',
      name: i18n.translate('xpack.queryRules.queryRulesSetTable.nameColumn', {
        defaultMessage: 'Query Rule Set',
      }),
      render: (name: string) => (
        <div data-test-subj="query-rules-set-item-name">
          <EuiLink
            data-test-subj="searchQueryRulesColumnsLink"
            onClick={() =>
              application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/sets/${name}`))
            }
          >
            {name}
          </EuiLink>
        </div>
      ),
    },
    {
      field: 'rule_total_count',
      name: i18n.translate('xpack.queryRules.queryRulesSetTable.ruleCount', {
        defaultMessage: 'Rule Count',
      }),
      render: (ruleCount: number) => (
        <div data-test-subj="query-rules-set-item-rule-count">{ruleCount}</div>
      ),
    },
    {
      actions: [
        {
          name: i18n.translate('xpack.queryRules.queryRulesSetTable.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: (queryRuleSet: QueryRulesListRulesetsQueryRulesetListItem) =>
            i18n.translate('xpack.queryRules.queryRulesSetTable.actions.deleteDescription', {
              defaultMessage: 'Delete query rule set with {name}',
              values: { name: queryRuleSet.ruleset_id },
            }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (queryRuleSet: QueryRulesListRulesetsQueryRulesetListItem) => {
            // Delete logic here
          },
        },
        {
          name: i18n.translate('xpack.queryRules.queryRulesSetTable.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: (queryRuleSet: QueryRulesListRulesetsQueryRulesetListItem) =>
            i18n.translate('xpack.queryRules.queryRulesSetTable.actions.editDescription', {
              defaultMessage: 'Edit query rule set {name}',
              values: { name: queryRuleSet.ruleset_id },
            }),
          icon: 'pencil',
          color: 'text',
          type: 'icon',
          onClick: (queryRuleSet: QueryRulesListRulesetsQueryRulesetListItem) =>
            application.navigateToUrl(
              http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/sets/${queryRuleSet.ruleset_id}`)
            ),
        },
      ],
    },
  ];

  return (
    <>
      <EuiBasicTable
        data-test-subj="query-rules-set-table"
        items={queryRulesData.data}
        columns={columns}
        pagination={pagination}
        onChange={({ page: changedPage }) => {
          setPageIndex(changedPage.index);
          setPageSize(changedPage.size);
        }}
      />
    </>
  );
};
