/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { PrivmonLoginDoc } from '../../../../common/api/entity_analytics/privmon';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HeaderSection } from '../../../common/components/header_section';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface LoginsTableProps {
  data: PrivmonLoginDoc[];
  isLoading: boolean;
}

export const LoginsTable = React.memo(({ data, isLoading }: LoginsTableProps) => {
  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={'Logins'}
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

LoginsTable.displayName = 'LoginsTable';

const getTableColumns = () => [
  {
    field: 'user.name',
    name: 'User',
  },
  {
    field: 'host.hostname',
    name: 'Host',
  },
  {
    field: 'source.geo.city_name',
    name: 'Origin city',
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
