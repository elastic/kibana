/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHealth, EuiText } from '@elastic/eui';
import { capitalize } from 'lodash';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { TableId } from '@kbn/securitysolution-data-table';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { COUNT_TABLE_TITLE } from '../alerts_count_panel/translations';
import * as i18n from './translations';
import {
  CellActionsMode,
  SecurityCellActionsTrigger,
  SecurityCellActions,
  SecurityCellActionType,
} from '../../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../../helpers';

export const getSeverityTableColumns = (): Array<EuiBasicTableColumn<SeverityData>> => [
  {
    field: 'key',
    name: i18n.SEVERITY_LEVEL_COLUMN_TITLE,
    'data-test-subj': 'severityTable-severity',
    render: (severity: Severity) => (
      <EuiHealth color={SEVERITY_COLOR[severity]} textSize="xs">
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
  {
    field: 'key',
    name: '',
    'data-test-subj': 'severityTable-actions',
    width: '16%',
    render: (severity: Severity) => (
      <SecurityCellActions
        mode={CellActionsMode.INLINE}
        visibleCellActions={0}
        triggerId={SecurityCellActionsTrigger.DEFAULT}
        data={{ field: ALERT_SEVERITY, value: severity }}
        sourcererScopeId={getSourcererScopeId(TableId.alertsOnAlertsPage)}
        disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
        metadata={{ scopeId: TableId.alertsOnAlertsPage }}
        extraActionsIconType="boxesVertical"
        extraActionsColor="text"
      />
    ),
  },
];
