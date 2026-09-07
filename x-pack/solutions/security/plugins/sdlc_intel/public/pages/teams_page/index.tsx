/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyncStatusBanner } from '../../components/sync_status_banner';
import { ContributionMatrix } from './components/contribution_matrix';
import { SubteamHealthCards } from './components/subteam_health_cards';
import { TeamEpicPipeline } from './components/team_epic_pipeline';
import { TeamHealthCards } from './components/team_health_cards';
import { TeamsSummaryMetrics } from './components/teams_summary_metrics';
import { useTeamsData } from './hooks/use_teams_data';

export const TeamsPage = () => {
  const { euiTheme } = useEuiTheme();
  const {
    loading,
    error,
    summary,
    teams,
    matrix,
    membersTotal,
    averageTeamsPerEpic,
    selectedTeamKey,
    selectedSubteamKey,
    selectedSubteam,
    subteamsForSelectedOrg,
    selectedEpics,
    setSelectedTeamKey,
    setSelectedSubteamKey,
    clearSelectedTeam,
    clearSelectedSubteam,
  } = useTeamsData();

  const selectedTeam = useMemo(
    () => teams.find((team) => team.key === selectedTeamKey),
    [teams, selectedTeamKey]
  );

  return (
    <div
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiPageTemplate restrictWidth={false} paddingSize="none" offset={0} grow={false}>
        <EuiPageTemplate.Header
          pageTitle={
            <FormattedMessage
              id="xpack.sdlcIntel.teams.pageTitle"
              defaultMessage="Development lifecycle — team dimension"
            />
          }
          description={
            <>
              <SyncStatusBanner />
              {!loading && teams.length > 0 ? (
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.sdlcIntel.teams.headerMeta"
                    defaultMessage="{members} members · {teams} teams"
                    values={{ members: membersTotal, teams: teams.length }}
                  />
                </EuiText>
              ) : null}
            </>
          }
          bottomBorder
        />

        <EuiPageTemplate.Section paddingSize="none">
          {loading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}

          {!loading && error ? (
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.sdlcIntel.teams.loadErrorTitle"
                  defaultMessage="Unable to load team dimension dashboard"
                />
              }
              color="danger"
              iconType="error"
            >
              {error}
            </EuiCallOut>
          ) : null}

          {!loading && !error && summary && matrix ? (
            <>
              <TeamsSummaryMetrics summary={summary} averageTeamsPerEpic={averageTeamsPerEpic} />
              <EuiSpacer size="l" />

              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.sdlcIntel.teams.healthTitle"
                    defaultMessage="Team health"
                  />
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.teams.healthSubtitle"
                  defaultMessage="Select an org team, then a subteam (e.g. One Workflow) to see epics, GitHub teams, and planning boards."
                />
              </EuiText>
              <EuiSpacer size="s" />
              <TeamHealthCards
                teams={teams}
                selectedTeamKey={selectedTeamKey}
                onSelectTeam={setSelectedTeamKey}
              />
              <EuiSpacer size="l" />

              {selectedTeam && subteamsForSelectedOrg.length > 0 ? (
                <>
                  <EuiText size="s">
                    <strong>
                      <FormattedMessage
                        id="xpack.sdlcIntel.teams.subteamsTitle"
                        defaultMessage="{teamName} — subteams"
                        values={{ teamName: selectedTeam.name }}
                      />
                    </strong>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <SubteamHealthCards
                    orgTeamKey={selectedTeam.key}
                    subteams={subteamsForSelectedOrg}
                    selectedSubteamKey={selectedSubteamKey}
                    onSelectSubteam={setSelectedSubteamKey}
                  />
                  <EuiSpacer size="l" />
                </>
              ) : null}

              {selectedTeam && selectedSubteam ? (
                <>
                  <TeamEpicPipeline
                    team={selectedTeam}
                    subteam={selectedSubteam}
                    epics={selectedEpics}
                    teams={teams}
                    onClearSelection={clearSelectedSubteam}
                    onClearOrgTeam={clearSelectedTeam}
                  />
                  <EuiSpacer size="l" />
                </>
              ) : null}

              <ContributionMatrix matrix={matrix} teams={teams} />
            </>
          ) : null}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </div>
  );
};
