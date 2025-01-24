/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { PrivmonLoginDoc } from '../../../../common/api/entity_analytics/privmon';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HeaderSection } from '../../../common/components/header_section';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface SuccessfulPrivilegedAccessProps {
  data: PrivmonLoginDoc[];
  isLoading: boolean;
}

export const SuccessfulPrivilegedAccess = React.memo(
  ({ data, isLoading }: SuccessfulPrivilegedAccessProps) => {
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'Successful privileged access'}
          titleSize="s"
          showInspectButton={false}
        />
        <EuiBasicTable items={data} columns={getTableColumns()} loading={isLoading} />
        <EuiSpacer size="m" />
      </EuiPanel>
    );
  }
);

SuccessfulPrivilegedAccess.displayName = 'SuccessfulPrivilegedAccess';

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
