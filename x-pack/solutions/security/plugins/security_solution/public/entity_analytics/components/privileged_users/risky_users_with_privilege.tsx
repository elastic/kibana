/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { EntityRiskScore, EntityType, RiskSeverity } from '../../../../common/search_strategy';
import { HeaderSection } from '../../../common/components/header_section';
import { RiskScoreLevel } from '../severity/common';

const DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID = 'vulnerableHostsBySeverityQuery';

interface RiskyUsersWithPrivilegeProps {
  data: Array<EntityRiskScore<EntityType.user>>;
  isLoading: boolean;
}

export const RiskyUsersWithPrivilege = React.memo(
  ({ data, isLoading }: RiskyUsersWithPrivilegeProps) => {
    return (
      <EuiPanel hasBorder>
        <HeaderSection
          id={DETECTION_RESPONSE_HOST_SEVERITY_QUERY_ID}
          title={'High risky users with privilege'}
          titleSize="s"
          showInspectButton={false}
        />
        <EuiBasicTable items={data} columns={getTableColumns()} loading={isLoading} />
        <EuiSpacer size="m" />
      </EuiPanel>
    );
  }
);

RiskyUsersWithPrivilege.displayName = 'RiskyUsersWithPrivilege';

const getTableColumns = () => [
  {
    field: 'user.name',
    name: 'User',
  },
  {
    field: 'user.risk.calculated_level',
    name: 'Level',
    render: (risk: RiskSeverity) => <RiskScoreLevel severity={risk} />,
  },
];
