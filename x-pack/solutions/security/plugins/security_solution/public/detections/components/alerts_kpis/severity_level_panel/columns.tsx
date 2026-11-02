/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiHealth, EuiText } from '@elastic/eui';
import { capitalize } from 'lodash';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { TableId } from '@kbn/securitysolution-data-table';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';
import * as i18n from './translations';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionType,
} from '../../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../../helpers';

/**
 * Returns the list of columns for the severity table for the KPI charts
 * @param showCellActions if true, add a third column for cell actions
 */
export const useGetSeverityTableColumns = (
  showCellActions: boolean
): Array<EuiBasicTableColumn<SeverityData>> => {
  const severityColors = useRiskSeverityColors();
  return useMemo(() => {
    const baseColumns: Array<EuiBasicTableColumn<SeverityData>> = [
      {
        field: 'key',
        name: i18n.SEVERITY_LEVEL_COLUMN_TITLE,
        'data-test-subj': 'severityTable-severity',
        render: (severity: Severity) => (
          <EuiHealth color={severityColors[severity]} textSize="xs">
            {capitalize(severity)}
          </EuiHealth>
        ),
      },
      {
        field: 'value',
        name: COUNT_TABLE_TITLE,
        dataType: 'number',
        'data-test-subj': 'severityTable-alertCount',
        width: '34%',
        render: (alertCount: number) => (
          <EuiText grow={false} size="xs">
            <FormattedCount count={alertCount} />
          </EuiText>
        ),
      },
    ];
    if (showCellActions) {
      baseColumns.push({
        field: 'key',
        name: '',
        'data-test-subj': 'severityTable-actions',
        width: '16%',
        render: (severity: Severity) => (
          <SecurityCellActions
            mode={CellActionsMode.INLINE}
            visibleCellActions={0}
            triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
            data={{ field: ALERT_SEVERITY, value: severity }}
            sourcererScopeId={getSourcererScopeId(TableId.alertsOnAlertsPage)}
            disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
            metadata={{ scopeId: TableId.alertsOnAlertsPage }}
            extraActionsIconType="boxesVertical"
            extraActionsColor="text"
          />
        ),
      });
    }
    return baseColumns;
  }, [severityColors, showCellActions]);
};
