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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IntelligencePanel, SectionLabel } from '../components';
import { externalAgentGroupIdLabel, claudeDesktopCoverage } from './external_agent_provider';
import { GoogleAdkContextPanel } from './google_adk_context';
import { AgentTimestamp } from './agent_evidence';
import { getCodexSessionModels, getCodexSessionTitle } from './codex_model';
import type { CodexSession } from './codex_types';

export const CodexOutcomeStrip: React.FC<{ session: CodexSession }> = ({ session }) => {
  const { euiTheme } = useEuiTheme();
  const segments = [
    {
      count: session.successes,
      color: euiTheme.colors.success,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.success',
        { defaultMessage: 'Succeeded' }
      ),
    },
    {
      count: session.failures,
      color: euiTheme.colors.danger,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.failure',
        { defaultMessage: 'Failed' }
      ),
    },
    {
      count: session.unknowns,
      color: euiTheme.colors.mediumShade,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.unknown',
        { defaultMessage: 'Unknown' }
      ),
    },
  ];
  return (
    <div
      css={css`
        min-width: 200px;
      `}
    >
      <div
        css={css`
          display: flex;
          gap: 2px;
          height: 7px;
          overflow: hidden;
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.lightShade};
        `}
        aria-hidden="true"
      >
        {segments
          .filter(({ count }) => count > 0)
          .map(({ count, color, label }) => (
            <div key={label} style={{ flex: count, backgroundColor: color }} />
          ))}
      </div>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        {segments.map(({ count, color, label }) => (
          <EuiFlexItem key={label} grow={false}>
            <EuiText size="xs">
              <EuiIcon type="dot" color={color} aria-hidden={true} /> {count.toLocaleString()}{' '}
              {label}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

export const CodexSessionContext: React.FC<{ session: CodexSession }> = ({ session }) =>
  session.googleAdk ? (
    <GoogleAdkContextPanel context={session.googleAdk} />
  ) : (
    <IntelligencePanel>
      <SectionLabel>
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.identityTitle',
          { defaultMessage: 'Identity & access' }
        )}
      </SectionLabel>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type="responsiveColumn"
        compressed
        listItems={[
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.content.sessionTitle',
              { defaultMessage: 'Recorded label' }
            ),
            description: getCodexSessionTitle(session),
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.owner',
              { defaultMessage: 'Local account owner' }
            ),
            description: session.owner ? (
              <>
                <EuiIcon type="user" aria-hidden={true} /> {session.owner.name}{' '}
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.ownerSource',
                    { defaultMessage: 'Source file ownership' }
                  )}
                </EuiBadge>
              </>
            ) : (
              '—'
            ),
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.creator',
              { defaultMessage: 'Session creator' }
            ),
            description:
              session.creator?.id ??
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.creatorMissing',
                { defaultMessage: 'Not recorded in this session' }
              ),
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.account',
              { defaultMessage: 'Creator account' }
            ),
            description: session.creator?.accountId ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.installation',
              { defaultMessage: 'Installation' }
            ),
            description: session.agentId,
          },
          {
            title: externalAgentGroupIdLabel(session.provider),
            description: session.id,
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.role',
              { defaultMessage: 'Agent role' }
            ),
            description: session.agentPath ?? session.role ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.recordedModels',
              { defaultMessage: 'Recorded models' }
            ),
            description: getCodexSessionModels(session).join(', ') || '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.sandbox',
              { defaultMessage: 'Last observed sandbox' }
            ),
            description: session.sandbox ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.approval',
              { defaultMessage: 'Last observed approval policy' }
            ),
            description: session.approval ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.version',
              { defaultMessage: 'Agent version' }
            ),
            description: session.version ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.permissions',
              { defaultMessage: 'Effective delegated permissions' }
            ),
            description: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.authorityUnknown',
              { defaultMessage: 'Not established by this source' }
            ),
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.imported',
              { defaultMessage: 'Snapshot imported' }
            ),
            description: <AgentTimestamp value={session.ingestedAt} />,
          },
        ]}
      />
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          {session.provider === 'claude_desktop'
            ? claudeDesktopCoverage()
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.attributionDetail',
                {
                  defaultMessage:
                    'Local ownership identifies the account that owns the source files. Session creator identifies the recorded creator, when present. Neither establishes the requester of each tool call.',
                }
              )}
        </p>
      </EuiText>
    </IntelligencePanel>
  );
