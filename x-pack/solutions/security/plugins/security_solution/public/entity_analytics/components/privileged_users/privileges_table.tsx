/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { PrivmonPrivilegeDoc } from '../../../../common/api/entity_analytics/privmon';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HeaderSection } from '../../../common/components/header_section';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface PrivilegesTableProps {
  data: PrivmonPrivilegeDoc[];
  isLoading: boolean;
}

export const PrivilegesTable = React.memo(({ data, isLoading }: PrivilegesTableProps) => {
  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={'Privileges table'}
        titleSize="s"
        showInspectButton={false}
      />
      <EuiBasicTable items={data.slice(0, 5)} columns={getTableColumns()} loading={isLoading} />
      <EuiSpacer size="m" />
    </EuiPanel>
  );
});

PrivilegesTable.displayName = 'PrivilegesTable';

const getTableColumns = () => [
  {
    field: 'user.name',
    name: 'User',
  },
  {
    field: 'event.action',
    name: 'Action',
  },
  {
    field: 'event.outcome',
    name: 'Outcome',
  },
  {
    field: '@timestamp',
    name: 'Time',
    render: (time: string) => {
      return <FormattedRelativePreferenceDate value={time} />;
    },
    width: '30%',
  },
];
