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
import type { DataTableRecord } from '@kbn/discover-utils';
import { getTableTabColumns } from '../utils/table_tab_columns';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from '../constants/test_ids';
import { getTableTabItems } from '../utils/table_tab_items';
import { getAllFieldsByName } from '../../../../common/containers/source';
import { getTimelineEventsDetailsFromRecord } from '../../../document/main/utils/get_timeline_events_details_from_record';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../../data_view_manager/constants';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';

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

export interface TableTabProps {
  /**
   * The attack document to display in the table
   */
  hit: DataTableRecord;
  /**
   * Wraps each value cell with cell actions (filter for/out, copy, etc.). The caller decides
   * what to inject (real security cell actions in Security Solution, no-op elsewhere).
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Table view displayed in the attack details flyout Table tab
 */
export const TableTab = memo(({ hit, renderCellActions }: TableTabProps) => {
  const smallFontSize = useEuiFontSize('xs').fontSize;
  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });

  const attackId = hit.id;

  const dataFormattedForFieldBrowser = useMemo(
    () => getTimelineEventsDetailsFromRecord(hit),
    [hit]
  );

  const browserFields = useBrowserFields(PageScope.attacks);

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
    () =>
      getTableTabColumns({
        browserFields,
        attackId,
        scopeId: PageScope.attacks,
        renderCellActions,
      }),
    [attackId, browserFields, renderCellActions]
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
