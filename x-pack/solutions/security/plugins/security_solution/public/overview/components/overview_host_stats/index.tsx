/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import styled from '@emotion/styled';

import type { HostsOverviewStrategyResponse } from '../../../../common/search_strategy';
import type { FormattedStat, StatGroup } from '../types';
import { StatValue } from '../stat_value';

interface OverviewHostProps {
  data: HostsOverviewStrategyResponse['overviewHost'];
  loading: boolean;
}

export const getOverviewHostStats = (
  data: HostsOverviewStrategyResponse['overviewHost']
): FormattedStat[] => [
  {
    count: data.auditbeatAuditd ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatAuditTitle"
        defaultMessage="Audit"
      />
    ),
    id: 'auditbeatAuditd',
  },
  {
    count: data.auditbeatFIM ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatFimTitle"
        defaultMessage="File Integrity Module"
      />
    ),
    id: 'auditbeatFIM',
  },
  {
    count: data.auditbeatLogin ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatLoginTitle"
        defaultMessage="Login"
      />
    ),
    id: 'auditbeatLogin',
  },
  {
    count: data.auditbeatPackage ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatPackageTitle"
        defaultMessage="Package"
      />
    ),
    id: 'auditbeatPackage',
  },
  {
    count: data.auditbeatProcess ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatProcessTitle"
        defaultMessage="Process"
      />
    ),
    id: 'auditbeatProcess',
  },
  {
    count: data.auditbeatUser ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatUserTitle"
        defaultMessage="User"
      />
    ),
    id: 'auditbeatUser',
  },
  {
    count: data.endgameDns ?? 0,
    title: (
      <FormattedMessage id="xpack.securitySolution.overview.endgameDnsTitle" defaultMessage="DNS" />
    ),
    id: 'endgameDns',
  },
  {
    count: data.endgameFile ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameFileTitle"
        defaultMessage="File"
      />
    ),
    id: 'endgameFile',
  },
  {
    count: data.endgameImageLoad ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameImageLoadTitle"
        defaultMessage="Image Load"
      />
    ),
    id: 'endgameImageLoad',
  },
  {
    count: data.endgameNetwork ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameNetworkTitle"
        defaultMessage="Network"
      />
    ),
    id: 'endgameNetwork',
  },
  {
    count: data.endgameProcess ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameProcessTitle"
        defaultMessage="Process"
      />
    ),
    id: 'endgameProcess',
  },
  {
    count: data.endgameRegistry ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameRegistryTitle"
        defaultMessage="Registry"
      />
    ),
    id: 'endgameRegistry',
  },
  {
    count: data.endgameSecurity ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.endgameSecurityTitle"
        defaultMessage="Security"
      />
    ),
    id: 'endgameSecurity',
  },
  {
    count: data.filebeatSystemModule ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatSystemModuleTitle"
        defaultMessage="System Module"
      />
    ),
    id: 'filebeatSystemModule',
  },
  {
    count: data.winlogbeatSecurity ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.winlogbeatSecurityTitle"
        defaultMessage="Security"
      />
    ),
    id: 'winlogbeatSecurity',
  },
  {
    count: data.winlogbeatMWSysmonOperational ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.winlogbeatMWSysmonOperational"
        defaultMessage="Microsoft-Windows-Sysmon/Operational"
      />
    ),
    id: 'winlogbeatMWSysmonOperational',
  },
];

const HostStatsContainer = styled.div`
  .accordion-button {
    width: 100%;
  }
`;

const hostStatGroups: StatGroup[] = [
  {
    groupId: 'auditbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.hostStatGroupAuditbeat"
        defaultMessage="Auditbeat"
      />
    ),
    statIds: [
      'auditbeatAuditd',
      'auditbeatFIM',
      'auditbeatLogin',
      'auditbeatPackage',
      'auditbeatProcess',
      'auditbeatUser',
    ],
  },
  {
    groupId: 'endgame',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.hostStatGroupElasticEndpointSecurity"
        defaultMessage="Endpoint Security"
      />
    ),
    statIds: [
      'endgameDns',
      'endgameFile',
      'endgameImageLoad',
      'endgameNetwork',
      'endgameProcess',
      'endgameRegistry',
      'endgameSecurity',
    ],
  },
  {
    groupId: 'filebeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.hostStatGroupFilebeat"
        defaultMessage="Filebeat"
      />
    ),
    statIds: ['filebeatSystemModule'],
  },
  {
    groupId: 'winlogbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.hostStatGroupWinlogbeat"
        defaultMessage="Winlogbeat"
      />
    ),
    statIds: ['winlogbeatSecurity', 'winlogbeatMWSysmonOperational'],
  },
];

const MoveItLeftTitle = styled.div`
  margin-left: 24px;
  @media only screen and (min-width: ${({ theme: { euiTheme } }) => euiTheme.breakpoint.m}) {
    max-width: 40px;
  }
`;
const MoveItLeft = styled.div`
  margin-left: 24px;
`;

const NoMarginTopFlexItem = styled(EuiFlexItem)`
  @media only screen and (max-width: ${({ theme: { euiTheme } }) => euiTheme.breakpoint.m}) {
    margin-top: -10px !important;
  }
`;

const AccordionContent = styled.div`
  padding-top: 8px;
`;

const OverviewHostStatsComponent: React.FC<OverviewHostProps> = ({ data, loading }) => {
  const allHostStats = getOverviewHostStats(data);
  const allHostStatsCount = allHostStats.reduce((total, stat) => total + stat.count, 0);
  return (
    <HostStatsContainer data-test-subj="overview-hosts-stats">
      {hostStatGroups.map((statGroup, i) => {
        const statsForGroup = allHostStats.filter((s) => statGroup.statIds.includes(s.id));
        const statsForGroupCount = statsForGroup.reduce((total, stat) => total + stat.count, 0);

        return (
          <React.Fragment key={statGroup.groupId}>
            <EuiHorizontalRule margin="xs" />
            <EuiAccordion
              id={`host-stat-accordion-group${statGroup.groupId}`}
              buttonContent={
                <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiText>{statGroup.name}</EuiText>
                  </EuiFlexItem>
                  <NoMarginTopFlexItem grow={false}>
                    <StatValue
                      count={statsForGroupCount}
                      isGroupStat={true}
                      isLoading={loading}
                      max={allHostStatsCount}
                    />
                  </NoMarginTopFlexItem>
                </EuiFlexGroup>
              }
              buttonContentClassName="accordion-button"
            >
              <AccordionContent>
                {statsForGroup.map((stat) => (
                  <EuiFlexGroup key={stat.id} gutterSize="s" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="s">
                        <MoveItLeftTitle>{stat.title}</MoveItLeftTitle>
                      </EuiText>
                    </EuiFlexItem>
                    <NoMarginTopFlexItem data-test-subj={`host-stat-${stat.id}`} grow={false}>
                      <MoveItLeft>
                        <StatValue
                          count={stat.count}
                          isGroupStat={false}
                          isLoading={loading}
                          max={statsForGroupCount}
                        />
                      </MoveItLeft>
                    </NoMarginTopFlexItem>
                  </EuiFlexGroup>
                ))}
              </AccordionContent>
            </EuiAccordion>
          </React.Fragment>
        );
      })}
    </HostStatsContainer>
  );
};

export const OverviewHostStats = React.memo(OverviewHostStatsComponent);
