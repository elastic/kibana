/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiInMemoryTable, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useAttackDetailsContext } from '../context';
import { getTableTabColumns } from '../utils/table_tab_columns';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { getTableTabItems } from '../utils/table_tab_items';
import { getAllFieldsByName } from '../../../common/containers/source';

const PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.table.filterPlaceholderLabel',
  {
    defaultMessage: 'Filter by field or value...',
  }
);

/**
 * Defines the behavior of the search input that appears above the table of data
 */
const SEARCH_CONFIG = {
  box: {
    incremental: true,
    placeholder: PLACEHOLDER,
    schema: true,
    'data-test-subj': TABLE_TAB_SEARCH_INPUT_TEST_ID,
  },
};

/**
 * Pagination options for the table
 */
const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

/**
 * Table view displayed in the attack details panel Table tab
 */
export const TableTab = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, attackId } = useAttackDetailsContext();
  const smallFontSize = useEuiFontSize('xs').fontSize;
  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });

  const onTableChange = useCallback(
    ({ page: { index } }: { page: { index: number } }) => setPagination({ pageIndex: index }),
    []
  );

  const paginationSettings = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
    }),
    [pagination]
  );

  const columns = useMemo(
    () => getTableTabColumns({ browserFields, attackId }),
    [attackId, browserFields]
  );

  const items = useMemo(
    () =>
      getTableTabItems({
        dataFormattedForFieldBrowser,
        fieldsByName: getAllFieldsByName(browserFields),
      }),
    [browserFields, dataFormattedForFieldBrowser]
  );

  return (
    <EuiInMemoryTable
      items={items}
      itemId="field"
      columns={columns}
      search={SEARCH_CONFIG}
      pagination={paginationSettings}
      onTableChange={onTableChange}
      sorting={false}
      data-test-subj={TABLE_TAB_CONTENT_TEST_ID}
      css={css`
        .euiTableRow {
          font-size: ${smallFontSize};
        }
      `}
    />
  );
});

TableTab.displayName = 'TableTab';
