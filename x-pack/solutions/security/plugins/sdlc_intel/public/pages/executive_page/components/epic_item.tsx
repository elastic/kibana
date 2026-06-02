/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcEpicPhaseSummary } from '../../../../common/api/types';
import {
  getDeckBucketLabel,
  getEpicStatusLabel,
  getCoverageLevel,
} from '../lib/coverage_utils';
import { TicketsView } from './tickets_view';

const getEpicStatusColor = (status: string): 'success' | 'warning' | 'default' => {
  if (status === 'closed') {
    return 'success';
  }
  if (status === 'in-progress') {
    return 'warning';
  }
  return 'default';
};

export const EpicItem = ({
  epic,
  forceOpen,
}: {
  epic: SdlcEpicPhaseSummary;
  forceOpen?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const coverageLevel = getCoverageLevel(epic.coveragePct);
  const isAtRisk = coverageLevel === 'risk';
  const releaseLabel = getDeckBucketLabel(epic.release?.deckBucket, epic.release?.milestone);
  const teamTags = [
    epic.owner ? `WT ${epic.owner}` : epic.teams.ownEngineeringTeam,
    'Kibana Platform',
    ...(epic.productTags ?? []),
  ].filter((tag): tag is string => Boolean(tag));

  return (
    <EuiAccordion
      id={`epic-${epic.id}`}
      forceState={forceOpen === undefined ? undefined : forceOpen ? 'open' : 'closed'}
      initialIsOpen={false}
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${isAtRisk ? euiTheme.colors.backgroundLightWarning : euiTheme.colors.emptyShade};
        overflow: hidden;
      `}
      buttonProps={{
        css: css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
        `,
      }}
      buttonContent={
        <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <code>{epic.displayId}</code>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{epic.title}</strong>
                </EuiText>
              </EuiFlexItem>
              {releaseLabel ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">{releaseLabel}</EuiBadge>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={getEpicStatusColor(epic.status)}>
                    {getEpicStatusLabel(epic.status)}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {isAtRisk ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">
                    <FormattedMessage
                      id="xpack.sdlcIntel.executive.epic.atRisk"
                      defaultMessage="At risk"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            {epic.summary ? (
              <EuiText size="s" color="subdued">
                {epic.summary}
              </EuiText>
            ) : null}
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
              {teamTags.map((team) => (
                <EuiFlexItem grow={false} key={team}>
                  <EuiBadge iconType={team.startsWith('WT ') ? 'user' : 'tag'}>{team}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false} style={{ width: 120 }}>
                <EuiText size="xs" textAlign="right" color="subdued">
                  <FormattedMessage
                    id="xpack.sdlcIntel.executive.epic.coverage"
                    defaultMessage="{coveragePct}% coverage"
                    values={{ coveragePct: epic.coveragePct }}
                  />
                </EuiText>
                <EuiProgress
                  value={epic.coveragePct}
                  max={100}
                  size="s"
                  color={coverageLevel === 'good' ? 'success' : coverageLevel === 'amber' ? 'warning' : 'danger'}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" responsive={false}>
                  {epic.links.projectUrl ? (
                    <EuiFlexItem grow={false}>
                      <EuiLink href={epic.links.projectUrl} target="_blank" external>
                        <FormattedMessage
                          id="xpack.sdlcIntel.executive.epic.projectLink"
                          defaultMessage="Project"
                        />
                      </EuiLink>
                    </EuiFlexItem>
                  ) : null}
                  {epic.links.prdUrl ? (
                    <EuiFlexItem grow={false}>
                      <EuiLink href={epic.links.prdUrl} target="_blank" external>
                        <FormattedMessage
                          id="xpack.sdlcIntel.executive.epic.prdLink"
                          defaultMessage="PRD"
                        />
                      </EuiLink>
                    </EuiFlexItem>
                  ) : null}
                  {epic.links.archUrl ? (
                    <EuiFlexItem grow={false}>
                      <EuiLink href={epic.links.archUrl} target="_blank" external>
                        <FormattedMessage
                          id="xpack.sdlcIntel.executive.epic.archLink"
                          defaultMessage="Arch"
                        />
                      </EuiLink>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m};
          background: ${euiTheme.colors.lightestShade};
          border-top: ${euiTheme.border.thin};
        `}
      >
        <TicketsView ticketsByRepo={epic.ticketsByRepo} />
      </div>
    </EuiAccordion>
  );
};
