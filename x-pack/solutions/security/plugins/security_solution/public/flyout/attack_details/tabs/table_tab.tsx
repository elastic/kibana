/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiInMemoryTable, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useAttackDetailsContext } from '../context';
import { getTableTabColumns } from '../utils/table_tab_columns';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { getTableTabItems } from '../utils/table_tab_items';

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
 * Table view displayed in the attack details panel Table tab
 */
export const TableTab = memo(() => {
  const { attack } = useAttackDetailsContext();
  const smallFontSize = useEuiFontSize('xs').fontSize;

  const columns = useMemo(() => getTableTabColumns(), []);
  const items = useMemo(() => getTableTabItems({ attack }), [attack]);

  return (
    <EuiInMemoryTable
      items={items}
      itemId="field"
      columns={columns}
      search={{ ...SEARCH_CONFIG }}
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
