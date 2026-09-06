/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcTeamsResponse } from '../../../../common/api/types';

export const TeamsSummaryMetrics = ({
  summary,
  averageTeamsPerEpic,
}: {
  summary: SdlcTeamsResponse['summary'];
  averageTeamsPerEpic: number;
}) => (
  <EuiFlexGroup gutterSize="m" responsive={false}>
    <EuiFlexItem grow>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={summary.teamsContributing}
          description={
            <FormattedMessage
              id="xpack.sdlcIntel.teams.metrics.contributing"
              defaultMessage="Teams contributing"
            />
          }
        />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.sdlcIntel.teams.metrics.contributingSub"
            defaultMessage="of {total} active on roadmap"
            values={{ total: summary.teamsTotal }}
          />
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem grow>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={summary.crossTeamEpics}
          description={
            <FormattedMessage
              id="xpack.sdlcIntel.teams.metrics.crossTeam"
              defaultMessage="Cross-team epics"
            />
          }
        />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.sdlcIntel.teams.metrics.crossTeamSub"
            defaultMessage="avg {avg} teams per epic"
            values={{ avg: averageTeamsPerEpic }}
          />
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem grow>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={`${summary.ticketsToProdPct}%`}
          description={
            <FormattedMessage
              id="xpack.sdlcIntel.teams.metrics.toProd"
              defaultMessage="Tickets to production"
            />
          }
        />
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem grow>
      <EuiPanel hasBorder paddingSize="m">
        <EuiStat
          title={`${summary.aiAdoptionPct}%`}
          description={
            <FormattedMessage
              id="xpack.sdlcIntel.teams.metrics.aiAdoption"
              defaultMessage="AI ticket adoption"
            />
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
