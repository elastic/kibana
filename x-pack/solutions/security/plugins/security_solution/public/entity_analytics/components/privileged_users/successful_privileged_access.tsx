/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type {
  PrivilegedUserDoc,
  PrivmonLoginDoc,
} from '../../../../common/api/entity_analytics/privmon';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HeaderSection } from '../../../common/components/header_section';
import { PrivilegedUserName } from './privileged_user_name';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface SuccessfulPrivilegedAccessProps {
  data: PrivmonLoginDoc[];
  privilegedUsers: PrivilegedUserDoc[];
  isLoading: boolean;
}

export const SuccessfulPrivilegedAccess = React.memo(
  ({ data, privilegedUsers, isLoading }: SuccessfulPrivilegedAccessProps) => {
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'Successful privileged access'}
          titleSize="s"
          showInspectButton={false}
        />

        <EuiInMemoryTable
          items={data}
          columns={getTableColumns(privilegedUsers)}
          loading={isLoading}
          pagination={{
            pageSizeOptions: [5, 10, 20],
            initialPageSize: 5,
          }}
        />
        <EuiSpacer size="m" />
      </EuiPanel>
    );
  }
);

SuccessfulPrivilegedAccess.displayName = 'SuccessfulPrivilegedAccess';

const getTableColumns = (privilegedUsers: PrivilegedUserDoc[]) => [
  {
    field: 'user.name',
    name: 'User',
    render: (name: string, data: PrivmonLoginDoc) => {
      const privilegedUser = privilegedUsers.find(({ user }) => user.name === name);

      if (!privilegedUser) {
        return name;
      }

      return <PrivilegedUserName privilegedUser={privilegedUser} />;
    },
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
