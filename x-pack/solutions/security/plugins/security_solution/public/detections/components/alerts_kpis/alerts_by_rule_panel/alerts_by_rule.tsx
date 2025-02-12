/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import type { AlertsByRuleData } from './types';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ALERTS_HEADERS_RULE_NAME } from '../../alerts_table/translations';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
  SecurityCellActionType,
} from '../../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../../helpers';

const TABLE_HEIGHT = 210; // px

export interface AlertsByRuleProps {
  data: AlertsByRuleData[];
  isLoading: boolean;
}

const COLUMNS: Array<EuiBasicTableColumn<AlertsByRuleData>> = [
  {
    field: 'rule',
    name: ALERTS_HEADERS_RULE_NAME,
    'data-test-subj': 'alert-by-rule-table-rule-name',
    truncateText: true,
    render: (rule: string) => (
      <EuiText size="xs" className="eui-textTruncate">
        {rule}
      </EuiText>
    ),
  },
  {
    field: 'value',
    name: COUNT_TABLE_TITLE,
    dataType: 'number',
    sortable: true,
    'data-test-subj': 'alert-by-rule-table-count',
    render: (count: number) => (
      <EuiText grow={false} size="xs">
        <FormattedCount count={count} />
      </EuiText>
    ),
    width: '22%',
  },
  {
    field: 'rule',
    name: '',
    'data-test-subj': 'alert-by-rule-table-actions',
    width: '10%',
    render: (rule: string) => (
      <SecurityCellActions
        mode={CellActionsMode.INLINE}
        visibleCellActions={0}
        triggerId={SecurityCellActionsTrigger.DEFAULT}
        data={{ field: ALERT_RULE_NAME, value: rule }}
        sourcererScopeId={getSourcererScopeId(TableId.alertsOnAlertsPage)}
        disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
        metadata={{ scopeId: TableId.alertsOnAlertsPage }}
        extraActionsIconType="boxesVertical"
        extraActionsColor="text"
      />
    ),
  },
];

const SORTING: { sort: { field: keyof AlertsByRuleData; direction: SortOrder } } = {
  sort: {
    field: 'value',
    direction: 'desc',
  },
};

const PAGINATION = {
  pageSize: 25,
  showPerPageOptions: false,
};

export const AlertsByRule: React.FC<AlertsByRuleProps> = ({ data, isLoading }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="alerts-by-rule"
      css={css`
        margin-top: -${euiTheme.size.m};
      `}
    >
      <EuiSpacer size="xs" />
      <div
        className="eui-yScroll"
        css={css`
          height: ${TABLE_HEIGHT}px;
        `}
      >
        <EuiInMemoryTable
          data-test-subj="alerts-by-rule-table"
          columns={COLUMNS}
          items={data}
          loading={isLoading}
          sorting={SORTING}
          pagination={PAGINATION}
        />
      </div>
    </div>
  );
};

AlertsByRule.displayName = 'AlertsByRule';
