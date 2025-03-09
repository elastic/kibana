/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type { PrivilegedUserDoc } from '../../../../common/api/entity_analytics/privmon';
import { HeaderSection } from '../../../common/components/header_section';
import { PrivilegedUserName } from './privileged_user_name';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface NewPrivilegedUsersProps {
  data: PrivilegedUserDoc[];
  isLoading: boolean;
}

export const NewPrivilegedUsers = React.memo(({ data, isLoading }: NewPrivilegedUsersProps) => {
  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
        title={'New privileged users '}
        titleSize="s"
        showInspectButton={false}
      />

      <EuiInMemoryTable
        items={data}
        columns={getTableColumns()}
        loading={isLoading}
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 5,
        }}
      />
      <EuiSpacer size="m" />
    </EuiPanel>
  );
});

NewPrivilegedUsers.displayName = 'NewPrivilegedUsers';

const getTableColumns = () => [
  {
    field: 'user.name',
    name: 'User',
    render: (name: string, data: PrivilegedUserDoc) => <PrivilegedUserName privilegedUser={data} />,
  },
  {
    field: 'user.id',
    name: 'ID',
  },
  {
    field: 'created_at',
    name: 'Created at',
    render: (time: string) => {
      return <FormattedRelativePreferenceDate value={time} />;
    },
  },
];
