/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiEmptyPrompt, EuiInMemoryTable, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';

import type { DetonationSeverity } from '../../../common/detonate';
import type { DetonationAlert } from '../hooks/use_detonation_alerts';
import { useNavigateToDetonationAlerts } from '../hooks/use_navigate_to_detonation_alerts';
import { FormattedRelativePreferenceDate } from '../../common/components/formatted_date';
import { AlertAnalyzerAction } from './alert_analyzer_action';
import { DetonationSeverityCell } from './detonation_severity';
import {
  COLUMN_SEVERITY,
  COLUMN_TIMESTAMP,
  DETAIL_ALERT_ACTIONS,
  DETAIL_ALERT_LINK_TOOLTIP,
  DETAIL_ALERT_PROCESS,
  DETAIL_ALERT_RULE,
  DETAIL_ALERT_UNNAMED,
  DETAIL_ALERTS_TITLE,
  DETAIL_NO_ALERTS,
} from '../translations';

const KNOWN_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

const asSeverity = (value: string | null): DetonationSeverity | null =>
  value !== null && KNOWN_SEVERITIES.has(value) ? (value as DetonationSeverity) : null;

interface DetonationAlertsTableProps {
  alerts: DetonationAlert[];
  isLoading: boolean;
}

const DetonationAlertsTableComponent: React.FC<DetonationAlertsTableProps> = ({
  alerts,
  isLoading,
}) => {
  const { navigateToAlerts } = useNavigateToDetonationAlerts();

  const openAlert = useCallback(
    (alert: DetonationAlert) =>
      navigateToAlerts({ alertId: alert.alertId, timestamp: alert.timestamp }),
    [navigateToAlerts]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DetonationAlert>>>(
    () => [
      {
        field: 'timestamp',
        name: COLUMN_TIMESTAMP,
        width: '20%',
        sortable: true,
        render: (timestamp: string | null) =>
          timestamp ? <FormattedRelativePreferenceDate value={timestamp} /> : '—',
      },
      {
        field: 'ruleName',
        name: DETAIL_ALERT_RULE,
        render: (ruleName: string | null, alert: DetonationAlert) =>
          alert.alertId ? (
            <EuiToolTip content={DETAIL_ALERT_LINK_TOOLTIP}>
              <EuiLink onClick={() => openAlert(alert)} data-test-subj="detonateAlertLink">
                {ruleName ?? DETAIL_ALERT_UNNAMED}
              </EuiLink>
            </EuiToolTip>
          ) : (
            ruleName ?? '—'
          ),
      },
      {
        field: 'processName',
        name: DETAIL_ALERT_PROCESS,
        width: '20%',
        render: (processName: string | null) =>
          processName ? <code>{processName}</code> : <EuiText size="s">{'—'}</EuiText>,
      },
      {
        field: 'severity',
        name: COLUMN_SEVERITY,
        width: '12%',
        render: (severity: string | null) => (
          <DetonationSeverityCell severity={asSeverity(severity)} />
        ),
      },
      {
        name: DETAIL_ALERT_ACTIONS,
        width: '10%',
        align: 'right',
        render: (alert: DetonationAlert) => <AlertAnalyzerAction alert={alert} />,
      },
    ],
    [openAlert]
  );

  return (
    <EuiInMemoryTable
      data-test-subj="detonationAlertsTable"
      tableCaption={DETAIL_ALERTS_TITLE}
      items={alerts}
      columns={columns}
      loading={isLoading}
      pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25] }}
      sorting={{ sort: { field: 'timestamp', direction: 'desc' } }}
      noItemsMessage={
        isLoading ? undefined : (
          <EuiEmptyPrompt iconType="search" body={<p>{DETAIL_NO_ALERTS}</p>} />
        )
      }
    />
  );
};

export const DetonationAlertsTable = React.memo(DetonationAlertsTableComponent);
