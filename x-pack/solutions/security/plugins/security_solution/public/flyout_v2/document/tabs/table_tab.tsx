/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TableTab as SharedTableTab, type TableTabItem } from '../../shared/tabs/table_tab';
import { TABLE_TAB_TEST_ID } from '../components/test_ids';

export interface TableTabProps {
  hit: DataTableRecord;
}

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.flyout.document.table.documentFieldsCaption',
  { defaultMessage: 'Document fields' }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.flyout.document.table.filterPlaceholderLabel',
  { defaultMessage: 'Filter by field or value...' }
);

export const TableTab = memo(({ hit }: TableTabProps) => {
  const items = useMemo<TableTabItem[]>(
    () =>
      Object.entries(hit.flattened)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([field, value]) => ({
          field,
          value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
        })),
    [hit.flattened]
  );

  return (
    <SharedTableTab
      items={items}
      tableCaption={TABLE_CAPTION}
      data-test-subj={TABLE_TAB_TEST_ID}
      paginated
      searchPlaceholder={SEARCH_PLACEHOLDER}
      fieldColumnWidth="40%"
    />
  );
});

TableTab.displayName = 'TableTab';
