/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
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
        title={'Privileges'}
        titleSize="s"
        showInspectButton={false}
      />
      <EuiInMemoryTable
        items={data}
        columns={getTableColumns()}
        loading={isLoading}
        pagination={{
          pageSizeOptions: [5, 10],
          initialPageSize: 5,
        }}
      />
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
    field: 'group.name',
    name: 'Group',
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
