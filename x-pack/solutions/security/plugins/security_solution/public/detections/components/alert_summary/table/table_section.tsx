/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiResizableContainer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GroupedTable } from './grouped_table';
import { FieldList } from './field_list';

const FIELD_LIST_PANEL_ID = 'fieldList';
const TABLE_PANEL_ID = 'table';

const FIELD_LIST_INITIAL_WIDTH = 20; // %
const TABLE_INITIAL_WIDTH = 80; // %

const FIELD_LIST_MIN_WIDTH = '250px';
const TABLE_MIN_WIDTH = '70%';

export interface TableSectionProps {
  /**
   *
   */
  dataView: DataView;
}

/**
 *
 */
export const TableSection = memo(({ dataView }: TableSectionProps) => {
  return (
    <EuiResizableContainer
      css={css`
        height: 600px;
      `}
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel
            id={FIELD_LIST_PANEL_ID}
            initialSize={FIELD_LIST_INITIAL_WIDTH}
            minSize={FIELD_LIST_MIN_WIDTH}
          >
            <FieldList dataView={dataView} />
          </EuiResizablePanel>
          <EuiResizableButton />
          <EuiResizablePanel
            id={TABLE_PANEL_ID}
            initialSize={TABLE_INITIAL_WIDTH}
            minSize={TABLE_MIN_WIDTH}
          >
            <GroupedTable dataView={dataView} />
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
});

TableSection.displayName = 'TableSection';
