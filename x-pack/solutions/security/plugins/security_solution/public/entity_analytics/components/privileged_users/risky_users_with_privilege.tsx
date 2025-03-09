/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { PrivilegedUserDoc } from '../../../../common/api/entity_analytics/privmon';
import type { EntityRiskScore, EntityType, RiskSeverity } from '../../../../common/search_strategy';
import { HeaderSection } from '../../../common/components/header_section';
import { RiskScoreLevel } from '../severity/common';
import { PrivilegedUserName } from './privileged_user_name';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface RiskyUsersWithPrivilegeProps {
  data: Array<EntityRiskScore<EntityType.user>>;
  privilegedUsers: PrivilegedUserDoc[];
  isLoading: boolean;
}

export const RiskyUsersWithPrivilege = React.memo(
  ({ data, privilegedUsers, isLoading }: RiskyUsersWithPrivilegeProps) => {
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'Privileged users with a risk score'}
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

RiskyUsersWithPrivilege.displayName = 'RiskyUsersWithPrivilege';

const getTableColumns = (privilegedUsers: PrivilegedUserDoc[]) => [
  {
    field: 'user.name',
    name: 'User',
    render: (name: string, data: EntityRiskScore<EntityType.user>) => {
      const privilegedUser = privilegedUsers.find(({ user }) => user.name === name);

      if (!privilegedUser) {
        return name;
      }

      return <PrivilegedUserName privilegedUser={privilegedUser} />;
    },
  },
  {
    field: 'user.risk.calculated_level',
    name: 'Level',
    render: (risk: RiskSeverity) => <RiskScoreLevel severity={risk} />,
  },
];
