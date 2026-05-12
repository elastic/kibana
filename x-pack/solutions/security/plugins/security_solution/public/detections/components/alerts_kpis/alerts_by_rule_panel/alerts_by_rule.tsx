/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { useGetAlertsByRuleColumns } from './columns';
import type { AlertsByRuleData } from './types';

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;
const TableWrapper = styled.div`
  height: 210px;
`;

const SORTING: { sort: { field: keyof AlertsByRuleData; direction: SortOrder } } = {
  sort: {
    field: 'value',
    direction: 'desc',
  },
};

const PAGINATION: {} = {
  pageSize: 25,
  showPerPageOptions: false,
};

export interface AlertsByRuleProps {
  /**
   * Chart data
   */
  data: AlertsByRuleData[];
  /**
   * If true, renders the UIInMemoryTable loading state
   */
  isLoading: boolean;
  /**
   * If true, render the last column for cell actions (like filter for, out, add to timeline, copy...)
   */
  showCellActions: boolean;
}

export const AlertsByRule: React.FC<AlertsByRuleProps> = ({ data, isLoading, showCellActions }) => {
  const columns = useGetAlertsByRuleColumns(showCellActions);

  return (
    <Wrapper data-test-subj="alerts-by-rule">
      <EuiSpacer size="xs" />
      <TableWrapper className="eui-yScroll">
        <EuiInMemoryTable
          data-test-subj="alerts-by-rule-table"
          columns={columns}
          items={data}
          loading={isLoading}
          sorting={SORTING}
          pagination={PAGINATION}
          tableCaption={i18n.translate('xpack.securitySolution.alertsByRule.alertsByRuleCaption', {
            defaultMessage: 'Alerts by rule',
          })}
        />
      </TableWrapper>
    </Wrapper>
  );
};

AlertsByRule.displayName = 'AlertsByRule';
