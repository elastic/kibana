/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type { PrivilegedUserDoc } from '../../../../common/api/entity_analytics/privmon';
import { HeaderSection } from '../../../common/components/header_section';
import { PrivilegedUserName } from './privileged_user_name';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface UnusualAccessPatternsProps {
  data: Event[];
  privilegedUsers: PrivilegedUserDoc[];
  isLoading: boolean;
}

export const UnusualAccessPatterns = React.memo(
  ({ data, privilegedUsers, isLoading }: UnusualAccessPatternsProps) => {
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'Unusual Access Patterns'}
          titleSize="s"
          showInspectButton={false}
        />
        <EuiBasicTable
          items={data.slice(0, 5)}
          columns={getTableColumns(privilegedUsers)}
          loading={isLoading}
        />
        <EuiSpacer size="m" />
      </EuiPanel>
    );
  }
);

UnusualAccessPatterns.displayName = 'UnusualAccessPatterns';

const getTableColumns = (privilegedUsers: PrivilegedUserDoc[]) => [
  {
    field: 'user.name',
    name: 'User',
    render: (name: string, data: Event) => (
      <PrivilegedUserName
        userName={name}
        objects={[privilegedUsers.find(({ user }) => user.name === name[0]) || {}, data]}
      />
    ),
  },
  {
    field: 'user.id',
    name: 'ID',
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
