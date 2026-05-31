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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcTeamCard } from '../../../../common/api/types';
import { getTeamAccent } from '../lib/team_accents';
import { getTeamsMatrixGridTemplateColumns } from '../lib/teams_matrix_layout';

const getBarColor = (value: number): 'success' | 'warning' | 'danger' => {
  if (value >= 70) {
    return 'success';
  }
  if (value >= 50) {
    return 'warning';
  }
  return 'danger';
};

export const TeamHealthCards = ({
  teams,
  selectedTeamKey,
  onSelectTeam,
}: {
  teams: readonly SdlcTeamCard[];
  selectedTeamKey?: string;
  onSelectTeam: (teamKey: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  if (teams.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: ${getTeamsMatrixGridTemplateColumns(teams.length)};
        gap: ${euiTheme.size.s};
        width: 100%;
      `}
    >
      <div aria-hidden="true" />
      {teams.map((team) => {
        const accent = getTeamAccent(team.key);
        const donePct =
          team.ticketsTotal > 0 ? Math.round((team.ticketsDone / team.ticketsTotal) * 100) : 0;
        const isSelected = selectedTeamKey === team.key;

        return (
          <EuiPanel
            key={team.key}
            hasBorder
            paddingSize="s"
            onClick={() => onSelectTeam(team.key)}
            css={css`
              cursor: pointer;
              min-width: 0;
              border-color: ${isSelected ? accent.color : undefined};
              border-width: ${isSelected ? '2px' : undefined};
              background: ${isSelected ? '#FAFAFE' : euiTheme.colors.emptyShade};
            `}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <div
                  css={css`
                    width: 28px;
                    height: 28px;
                    border-radius: ${euiTheme.border.radius.medium};
                    background: ${accent.background};
                    color: ${accent.color};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type={accent.icon} size="s" />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>{team.name}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {team.membersCount}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <div css={css`margin-top: ${euiTheme.size.s}; display: flex; flex-direction: column; gap: 4px;`}>
              <MetricBar label="Gates" value={team.gatesPct} color={getBarColor(team.gatesPct)} />
              <MetricBar label="To prod" value={team.toProdPct} color="primary" />
              <MetricBar label="AI tkts" value={team.aiPct} color="accent" />
            </div>

            <EuiFlexGroup gutterSize="xs" responsive={false} wrap css={css`margin-top: ${euiTheme.size.s};`}>
              <EuiFlexItem grow={false}>
                <EuiBadge style={{ background: accent.background, color: accent.color }}>
                  <FormattedMessage
                    id="xpack.sdlcIntel.teams.card.epicCount"
                    defaultMessage="{count, plural, one {# epic} other {# epics}}"
                    values={{ count: team.epicCount }}
                  />
                </EuiBadge>
              </EuiFlexItem>
              {team.ticketsTotal > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">
                    <FormattedMessage
                      id="xpack.sdlcIntel.teams.card.donePct"
                      defaultMessage="{pct}% done"
                      values={{ pct: donePct }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiPanel>
        );
      })}
    </div>
  );
};

const MetricBar = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'success' | 'warning' | 'danger' | 'primary' | 'accent';
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false} style={{ minWidth: 52 }}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiProgress value={value} max={100} size="s" color={color} />
    </EuiFlexItem>
    <EuiFlexItem grow={false} style={{ minWidth: 28 }}>
      <EuiText size="xs" textAlign="right" color="subdued">
        {value}%
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
