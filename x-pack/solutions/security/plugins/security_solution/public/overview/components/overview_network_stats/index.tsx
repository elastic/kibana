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

import type { NetworkOverviewStrategyResponse } from '../../../../common/search_strategy';
import type { FormattedStat, StatGroup } from '../types';
import { StatValue } from '../stat_value';

interface OverviewNetworkProps {
  data: NetworkOverviewStrategyResponse['overviewNetwork'];
  loading: boolean;
}

export const getOverviewNetworkStats = (
  data: NetworkOverviewStrategyResponse['overviewNetwork']
): FormattedStat[] => [
  {
    count: data.auditbeatSocket ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.auditBeatSocketTitle"
        defaultMessage="Socket"
      />
    ),
    id: 'auditbeatSocket',
  },
  {
    count: data.filebeatCisco ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatCiscoTitle"
        defaultMessage="Cisco"
      />
    ),
    id: 'filebeatCisco',
  },
  {
    count: data.filebeatNetflow ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatNetflowTitle"
        defaultMessage="Netflow"
      />
    ),
    id: 'filebeatNetflow',
  },
  {
    count: data.filebeatPanw ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.filebeatPanwTitle"
        defaultMessage="Palo Alto Networks"
      />
    ),
    id: 'filebeatPanw',
  },
  {
    count: data.filebeatSuricata ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.fileBeatSuricataTitle"
        defaultMessage="Suricata"
      />
    ),
    id: 'filebeatSuricata',
  },
  {
    count: data.filebeatZeek ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.fileBeatZeekTitle"
        defaultMessage="Zeek"
      />
    ),
    id: 'filebeatZeek',
  },
  {
    count: data.packetbeatDNS ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetBeatDnsTitle"
        defaultMessage="DNS"
      />
    ),
    id: 'packetbeatDNS',
  },
  {
    count: data.packetbeatFlow ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetBeatFlowTitle"
        defaultMessage="Flow"
      />
    ),
    id: 'packetbeatFlow',
  },
  {
    count: data.packetbeatTLS ?? 0,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.overview.packetbeatTLSTitle"
        defaultMessage="TLS"
      />
    ),
    id: 'packetbeatTLS',
  },
];

const networkStatGroups: StatGroup[] = [
  {
    groupId: 'auditbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupAuditbeat"
        defaultMessage="Auditbeat"
      />
    ),
    statIds: ['auditbeatSocket'],
  },
  {
    groupId: 'filebeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupFilebeat"
        defaultMessage="Filebeat"
      />
    ),
    statIds: [
      'filebeatCisco',
      'filebeatNetflow',
      'filebeatPanw',
      'filebeatSuricata',
      'filebeatZeek',
    ],
  },
  {
    groupId: 'packetbeat',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.overview.networkStatGroupPacketbeat"
        defaultMessage="Packetbeat"
      />
    ),
    statIds: ['packetbeatDNS', 'packetbeatFlow', 'packetbeatTLS'],
  },
];

const NetworkStatsContainer = styled.div`
  .accordion-button {
    width: 100%;
  }
`;
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

const OverviewNetworkStatsComponent: React.FC<OverviewNetworkProps> = ({ data, loading }) => {
  const allNetworkStats = getOverviewNetworkStats(data);
  const allNetworkStatsCount = allNetworkStats.reduce((total, stat) => total + stat.count, 0);

  return (
    <NetworkStatsContainer data-test-subj="overview-network-stats">
      {networkStatGroups.map((statGroup, i) => {
        const statsForGroup = allNetworkStats.filter((s) => statGroup.statIds.includes(s.id));
        const statsForGroupCount = statsForGroup.reduce((total, stat) => total + stat.count, 0);

        return (
          <React.Fragment key={statGroup.groupId}>
            <EuiHorizontalRule margin="xs" />
            <EuiAccordion
              id={`network-stat-accordion-group${statGroup.groupId}`}
              buttonContent={
                <EuiFlexGroup
                  data-test-subj={`network-stat-group-${statGroup.groupId}`}
                  justifyContent="spaceBetween"
                  gutterSize="s"
                >
                  <EuiFlexItem grow={false}>
                    <EuiText>{statGroup.name}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <StatValue
                      count={statsForGroupCount}
                      isGroupStat={true}
                      isLoading={loading}
                      max={allNetworkStatsCount}
                    />
                  </EuiFlexItem>
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
                    <NoMarginTopFlexItem data-test-subj={`network-stat-${stat.id}`} grow={false}>
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
    </NetworkStatsContainer>
  );
};

export const OverviewNetworkStats = React.memo(OverviewNetworkStatsComponent);
