/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GroupedTable } from './grouped_table';
import { FieldList } from './field_list';

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
    <EuiFlexGroup
      css={css`
        height: 600px;
      `}
    >
      <EuiFlexItem grow={0}>
        <FieldList dataView={dataView} />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <GroupedTable dataView={dataView} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TableSection.displayName = 'TableSection';
