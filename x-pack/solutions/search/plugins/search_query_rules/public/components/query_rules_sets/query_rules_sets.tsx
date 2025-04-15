/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchQueryRulesSets } from '../../hooks/use_fetch_query_rules_sets';
import { useQueryRulesSetsTableData } from '../../hooks/use_query_rules_sets_table_data';
import { QueryRulesSetsSearch } from './query_rules_sets_search';

export const QueryRulesSets = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const [searchKey, setSearchKey] = useState('');
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const { data: queryRulesData } = useFetchQueryRulesSets({ from, size: pageSize });

  const { queryRulesSetsFilteredData, pagination } = useQueryRulesSetsTableData(
    queryRulesData?.data,
    searchKey,
    pageIndex,
    pageSize
  );

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
            // Navigate to the ruleset details page
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
  ];

  return (
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
          onChange={({ page: changedPage }) => {
            setPageIndex(changedPage.index);
            setPageSize(changedPage.size);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
