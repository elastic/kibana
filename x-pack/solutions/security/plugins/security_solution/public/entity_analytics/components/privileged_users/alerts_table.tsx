/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HeaderSection } from '../../../common/components/header_section';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface AlertsTableProps {
  alerts: Alert[];
  isLoading: boolean;
}

export const AlertsTable = React.memo(({ alerts, isLoading }: AlertsTableProps) => {
  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={'Alerts table'}
        titleSize="s"
        showInspectButton={false}
      />
      <EuiBasicTable items={alerts.slice(0, 5)} columns={getTableColumns()} loading={isLoading} />
      <EuiSpacer size="m" />
    </EuiPanel>
  );
});

AlertsTable.displayName = 'AlertsTable';

const getTableColumns = () => [
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
    truncateText: true,
  },
  {
    field: 'user.name',
    name: 'User',
  },
  {
    field: '@timestamp',
    name: 'Time',
    render: (time: string) => {
      return <FormattedRelativePreferenceDate value={time} />;
    },
  },
];
