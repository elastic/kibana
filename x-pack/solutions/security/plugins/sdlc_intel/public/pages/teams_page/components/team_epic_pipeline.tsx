/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcEpicPhaseSummary, SdlcTeamCard } from '../../../../common/api/types';
import { getOwnerInitials } from '../../executive_page/lib/coverage_utils';
import { getTeamAccent } from '../lib/team_accents';
import { getMiniPhaseGates, readTicketRollup, resolveTeamName } from '../lib/team_epic_utils';

const miniGateStyles = (
  gate: ReturnType<typeof getMiniPhaseGates>[number],
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
) => {
  if (gate === 'p') {
    return {
      background: euiTheme.colors.backgroundLightSuccess,
      color: euiTheme.colors.success,
    };
  }
  if (gate === 'w') {
    return {
      background: euiTheme.colors.backgroundLightWarning,
      color: euiTheme.colors.warning,
    };
  }
  if (gate === 'f') {
    return {
      background: euiTheme.colors.backgroundLightDanger,
      color: euiTheme.colors.danger,
    };
  }
  return {
    background: euiTheme.colors.lightestShade,
    color: euiTheme.colors.subduedText,
  };
};

export const TeamEpicPipeline = ({
  team,
  epics,
  teams,
  onClearSelection,
}: {
  team: SdlcTeamCard;
  epics: readonly SdlcEpicPhaseSummary[];
  teams: readonly SdlcTeamCard[];
  onClearSelection: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = getTeamAccent(team.key);

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <div
                css={css`
                  width: 32px;
                  height: 32px;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${accent.background};
                  color: ${accent.color};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                `}
              >
                <EuiIcon type={accent.icon} size="m" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.sdlcIntel.teams.pipeline.title"
                    defaultMessage="{teamName} — epic pipeline"
                    values={{ teamName: team.name }}
                  />
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.sdlcIntel.teams.pipeline.subtitle"
                  defaultMessage="{count, plural, one {# epic} other {# epics}} · {members} members"
                  values={{ count: epics.length, members: team.membersCount }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" iconType="cross" onClick={onClearSelection}>
            <FormattedMessage id="xpack.sdlcIntel.teams.pipeline.clear" defaultMessage="Clear" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {epics.length === 0 ? (
        <EuiText size="s" color="subdued" css={css`margin-top: ${euiTheme.size.m};`}>
          <FormattedMessage
            id="xpack.sdlcIntel.teams.pipeline.empty"
            defaultMessage="No epics assigned to this team."
          />
        </EuiText>
      ) : (
        <div
          css={css`
            margin-top: ${euiTheme.size.m};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.s};
          `}
        >
          {epics.map((epic) => (
            <EpicPipelineCard key={epic.id} epic={epic} teams={teams} />
          ))}
        </div>
      )}
    </EuiPanel>
  );
};

const EpicPipelineCard = ({
  epic,
  teams,
}: {
  epic: SdlcEpicPhaseSummary;
  teams: readonly SdlcTeamCard[];
}) => {
  const { euiTheme } = useEuiTheme();
  const phaseGates = getMiniPhaseGates(epic);
  const tickets = readTicketRollup(epic);
  const donePct = tickets.total > 0 ? Math.round((tickets.done / tickets.total) * 100) : 0;
  const aiPct = tickets.total > 0 ? Math.round((tickets.aiGen / tickets.total) * 100) : 0;
  const toProdPct = epic.deliveryCoveragePct ?? 0;

  return (
    <EuiPanel hasBorder paddingSize="s" css={css`background: ${euiTheme.colors.emptyShade};`}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiText size="s">
            <strong>{epic.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {epic.roadmap.title ?? epic.roadmap.id} · {epic.displayId}
          </EuiText>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} css={css`margin-top: ${euiTheme.size.xs};`}>
            {[
              ...(epic.teams.ownOrgTeam ? [epic.teams.ownOrgTeam] : []),
              ...epic.teams.contributingOrgTeams.filter((team) => team !== epic.teams.ownOrgTeam),
            ].map((teamKey) => {
              const accent = getTeamAccent(teamKey);
              return (
                <EuiFlexItem grow={false} key={teamKey}>
                  <EuiBadge style={{ background: accent.background, color: accent.color }}>
                    {resolveTeamName(teamKey, teams)}
                  </EuiBadge>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage id="xpack.sdlcIntel.teams.pipeline.owner" defaultMessage="Owner" />
          </EuiText>
          <EuiBadge color="hollow">{getOwnerInitials(epic.owner)}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div css={css`margin-top: ${euiTheme.size.s}; display: flex; gap: 2px;`}>
        {phaseGates.map((gate, index) => {
          const styles = miniGateStyles(gate, euiTheme);
          return (
            <span
              key={`${epic.id}-gate-${index}`}
              css={css`
                flex: 1;
                height: 6px;
                border-radius: 2px;
                background: ${styles.background};
              `}
              title={`P${index + 1}`}
            />
          );
        })}
      </div>

      <EuiFlexGroup gutterSize="m" responsive={false} css={css`margin-top: ${euiTheme.size.s};`}>
        <EuiFlexItem>
          <Metric label="Tickets done" value={`${tickets.done}/${tickets.total}`} pct={donePct} color="success" />
        </EuiFlexItem>
        <EuiFlexItem>
          <Metric label="To prod" value={`${toProdPct}%`} pct={toProdPct} color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <Metric label="AI tkts" value={`${aiPct}%`} pct={aiPct} color="accent" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const Metric = ({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: 'success' | 'primary' | 'accent';
}) => (
  <div>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiText size="xs">
      <strong>{value}</strong>
    </EuiText>
    <EuiProgress value={pct} max={100} size="s" color={color} />
  </div>
);
