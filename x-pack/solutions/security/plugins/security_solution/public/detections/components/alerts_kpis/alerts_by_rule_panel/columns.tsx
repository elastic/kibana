/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionType,
} from '../../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../../helpers';
import { ALERTS_HEADERS_RULE_NAME } from '../../alerts_table/translations';
import type { AlertsByRuleData } from './types';

const BASE_COLUMNS: Array<EuiBasicTableColumn<AlertsByRuleData>> = [
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
];

const CELL_ACTIONS_COLUMN: EuiBasicTableColumn<AlertsByRuleData> = {
  field: 'rule',
  name: '',
  'data-test-subj': 'alert-by-rule-table-actions',
  width: '10%',
  render: (rule: string) => (
    <SecurityCellActions
      mode={CellActionsMode.INLINE}
      visibleCellActions={0}
      triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
      data={{ field: ALERT_RULE_NAME, value: rule }}
      sourcererScopeId={getSourcererScopeId(TableId.alertsOnAlertsPage)}
      disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
      metadata={{ scopeId: TableId.alertsOnAlertsPage }}
      extraActionsIconType="boxesVertical"
      extraActionsColor="text"
    />
  ),
};

const ALL_COLUMNS = [...BASE_COLUMNS, CELL_ACTIONS_COLUMN];

/**
 * Returns the list of columns for the severity table for the KPI charts
 * @param showCellActions if true, add a third column for cell actions
 */
export const useGetAlertsByRuleColumns = (
  showCellActions: boolean
): Array<EuiBasicTableColumn<AlertsByRuleData>> => {
  return useMemo(() => (showCellActions ? ALL_COLUMNS : BASE_COLUMNS), [showCellActions]);
};
