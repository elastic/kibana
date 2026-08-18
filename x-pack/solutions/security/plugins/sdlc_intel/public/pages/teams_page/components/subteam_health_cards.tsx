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
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcSubteamCard } from '../../../../common/api/types';
import { getTeamAccent } from '../lib/team_accents';

const getBarColor = (value: number): 'success' | 'warning' | 'danger' => {
  if (value >= 70) {
    return 'success';
  }
  if (value >= 50) {
    return 'warning';
  }
  return 'danger';
};

export const SubteamHealthCards = ({
  orgTeamKey,
  subteams,
  selectedSubteamKey,
  onSelectSubteam,
}: {
  orgTeamKey: string;
  subteams: readonly SdlcSubteamCard[];
  selectedSubteamKey?: string;
  onSelectSubteam: (subteamKey: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = getTeamAccent(orgTeamKey);

  if (subteams.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: ${euiTheme.size.s};
        width: 100%;
      `}
    >
      {subteams.map((subteam) => {
        const donePct =
          subteam.ticketsTotal > 0
            ? Math.round((subteam.ticketsDone / subteam.ticketsTotal) * 100)
            : 0;
        const isSelected = selectedSubteamKey === subteam.key;

        return (
          <EuiPanel
            key={subteam.key}
            hasBorder
            paddingSize="s"
            onClick={() => onSelectSubteam(subteam.key)}
            css={css`
              cursor: pointer;
              border-color: ${isSelected ? accent.color : undefined};
              border-width: ${isSelected ? '2px' : undefined};
              background: ${isSelected ? '#FAFAFE' : euiTheme.colors.emptyShade};
            `}
          >
            <EuiText size="xs">
              <strong>{subteam.name}</strong>
            </EuiText>

            <div
              css={css`
                margin-top: ${euiTheme.size.s};
                display: flex;
                flex-direction: column;
                gap: 4px;
              `}
            >
              <MetricBar label="Gates" value={subteam.gatesPct} color={getBarColor(subteam.gatesPct)} />
              <MetricBar label="To prod" value={subteam.toProdPct} color="primary" />
            </div>

            <EuiFlexGroup gutterSize="xs" responsive={false} wrap css={css`margin-top: ${euiTheme.size.s};`}>
              <EuiFlexItem grow={false}>
                <EuiBadge style={{ background: accent.background, color: accent.color }}>
                  <FormattedMessage
                    id="xpack.sdlcIntel.teams.subteam.epicCount"
                    defaultMessage="{count, plural, one {# epic} other {# epics}}"
                    values={{ count: subteam.epicCount }}
                  />
                </EuiBadge>
              </EuiFlexItem>
              {subteam.ticketsTotal > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">
                    <FormattedMessage
                      id="xpack.sdlcIntel.teams.subteam.donePct"
                      defaultMessage="{pct}% done"
                      values={{ pct: donePct }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>

            <SubteamLinks subteam={subteam} />
          </EuiPanel>
        );
      })}
    </div>
  );
};

const SubteamLinks = ({ subteam }: { subteam: SdlcSubteamCard }) => {
  const { euiTheme } = useEuiTheme();
  const hasLinks =
    subteam.githubTeamUrls.length > 0 ||
    subteam.githubProjects.length > 0 ||
    subteam.projectTeamValues.length > 0;

  if (!hasLinks) {
    return null;
  }

  return (
    <div css={css`margin-top: ${euiTheme.size.s};`}>
      <EuiText size="xs" color="subdued">
        <FormattedMessage id="xpack.sdlcIntel.teams.subteam.links" defaultMessage="Links" />
      </EuiText>
      <ul
        css={css`
          margin: 4px 0 0;
          padding-left: 0;
          list-style: none;
        `}
      >
        {subteam.githubTeamUrls.map((url) => (
          <li key={url}>
            <EuiLink href={url} target="_blank" external>
              <EuiIcon type="users" size="s" /> GitHub team
            </EuiLink>
          </li>
        ))}
        {subteam.githubProjects.map((project) => (
          <li key={project.url}>
            <EuiLink href={project.url} target="_blank" external>
              <EuiIcon type="calendar" size="s" />{' '}
              {project.title ?? (
                <FormattedMessage
                  id="xpack.sdlcIntel.teams.subteam.projectLink"
                  defaultMessage="Project {number}"
                  values={{ number: project.number }}
                />
              )}
            </EuiLink>
          </li>
        ))}
      </ul>
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
