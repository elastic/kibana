/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiButtonEmpty, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { externalAgentGrouping } from './ai_agents/external_agent_provider';
import { ProviderIcon } from './ai_agents/provider_icon';
import type { ExecutiveBriefAgentSnapshot } from './executive_brief_agents';
import { briefFindingDescription, briefProviderStatusLabel } from './executive_brief_presentation';

export interface ExecutiveBriefAgentEvidenceProps {
  agents: ExecutiveBriefAgentSnapshot;
  onInvestigateAgent?: (id: string) => void;
  onInvestigateCodex?: (key: string) => void;
  onInvestigateCursor?: (key: string) => void;
  onInvestigateClaudeDesktop?: (key: string) => void;
  onInvestigateGoogleAdk?: (key: string) => void;
}

const metricValue = (value: number | undefined): string =>
  value === undefined ? '—' : value.toLocaleString();

export const ExecutiveBriefAgentEvidence: React.FC<ExecutiveBriefAgentEvidenceProps> = ({
  agents,
  onInvestigateAgent,
  onInvestigateCodex,
  onInvestigateCursor,
  onInvestigateClaudeDesktop,
  onInvestigateGoogleAdk,
}) => {
  const { euiTheme } = useEuiTheme();
  const providerGrid = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: euiTheme.size.m,
    '@media (max-width: 700px)': { gridTemplateColumns: '1fr' },
  });
  const card = css({
    padding: euiTheme.size.m,
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.medium,
    background: euiTheme.colors.backgroundBasePlain,
    minWidth: 0,
  });
  const row = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: euiTheme.size.s,
  });
  const titleRow = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
    minWidth: 0,
  });
  const metric = css({
    fontSize: euiTheme.size.xl,
    fontWeight: euiTheme.font.weight.bold,
    color: euiTheme.colors.textHeading,
  });
  const caption = css({
    fontSize: euiTheme.size.m,
    color: euiTheme.colors.textSubdued,
    lineHeight: 1.5,
  });
  return (
    <section data-test-subj="executiveBriefAgentEvidence">
      <div css={row}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.brief.agentEvidenceTitle',
              { defaultMessage: 'Agents in the identity landscape' }
            )}
          </h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.brief.agentWindow',
              {
                defaultMessage: 'Seen in the last {days} days',
                values: { days: agents.lookbackDays },
              }
            )}
          </p>
        </EuiText>
      </div>
      <div css={css({ marginTop: euiTheme.size.m })}>
        <div css={providerGrid}>
          {agents.providers.map((provider) => {
            const builder = provider.provider === 'agent_builder';
            const open = builder
              ? onInvestigateAgent
              : provider.provider === 'cursor'
              ? onInvestigateCursor
              : provider.provider === 'google_adk'
              ? onInvestigateGoogleAdk
              : provider.provider === 'claude_desktop'
              ? onInvestigateClaudeDesktop
              : onInvestigateCodex;
            return (
              <div
                key={provider.provider}
                css={card}
                data-test-subj={`executiveBriefProvider-${provider.provider}`}
              >
                <div css={row}>
                  <div css={titleRow}>
                    <ProviderIcon
                      provider={
                        provider.provider === 'agent_builder' ? 'elastic' : provider.provider
                      }
                      size={28}
                    />
                    <strong>{provider.name}</strong>
                  </div>
                  <EuiBadge color={provider.status === 'unavailable' ? 'warning' : 'hollow'}>
                    {briefProviderStatusLabel(provider.status)}
                  </EuiBadge>
                </div>
                <div css={css({ marginTop: euiTheme.size.m, marginBottom: euiTheme.size.s })}>
                  <span css={metric}>
                    {metricValue(builder ? provider.invocations : provider.sessions)}
                  </span>{' '}
                  <span css={caption}>
                    {builder
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.invocations',
                          { defaultMessage: 'invocations' }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.brief.sessions',
                          {
                            defaultMessage: '{grouping}',
                            values: {
                              grouping: externalAgentGrouping(
                                provider.provider === 'agent_builder'
                                  ? undefined
                                  : provider.provider,
                                true
                              ),
                            },
                          }
                        )}
                  </span>
                </div>
                <div css={caption}>
                  {builder
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.builderIdentities',
                        {
                          defaultMessage: '{count} configured agents',
                          values: { count: metricValue(provider.identityCount) },
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.accumulatedObservations',
                        {
                          defaultMessage: '{count} accumulated tool observations',
                          values: { count: metricValue(provider.toolObservations) },
                        }
                      )}
                </div>
                <div css={caption}>
                  {builder
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.failedInvocations',
                        {
                          defaultMessage: '{count} failed invocations',
                          values: { count: metricValue(provider.failedInvocations) },
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.brief.externalOutcomes',
                        {
                          defaultMessage: '{failed} failed · {unknown} unknown outcomes',
                          values: {
                            failed: metricValue(provider.failedToolObservations),
                            unknown: metricValue(provider.unknownToolOutcomes),
                          },
                        }
                      )}
                </div>
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  iconType="sortRight"
                  iconSide="right"
                  onClick={() => open?.('')}
                  disabled={
                    !open ||
                    provider.status === 'unavailable' ||
                    provider.status === 'loading' ||
                    provider.identityCount === 0
                  }
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.brief.exploreProvider',
                    { defaultMessage: 'Explore {provider}', values: { provider: provider.name } }
                  )}
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.brief.inspectActivity',
                    { defaultMessage: 'Inspect activity' }
                  )}
                </EuiButtonEmpty>
              </div>
            );
          })}
        </div>
      </div>
      {agents.changedSessions.length > 0 ? (
        <div css={css({ marginTop: euiTheme.size.m })}>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.behaviorContext',
                {
                  defaultMessage:
                    'Behavior changes are investigation leads. They do not establish malicious activity.',
                }
              )}
            </p>
          </EuiText>
          {agents.changedSessions.slice(0, 3).map((session) => (
            <div
              key={session.routeKey}
              css={css({
                display: 'flex',
                alignItems: 'center',
                gap: euiTheme.size.m,
                padding: euiTheme.size.m,
                borderBottom: euiTheme.border.thin,
              })}
            >
              <EuiIcon type="visBarVertical" color="warning" size="l" aria-hidden={true} />
              <div css={css({ flex: 1, minWidth: 0 })}>
                <strong>{session.title}</strong>
                <div css={caption}>
                  {session.findings.slice(0, 2).map(briefFindingDescription).join(' · ')}
                </div>
              </div>
              <EuiButtonEmpty
                size="xs"
                iconType="inspect"
                onClick={() =>
                  (session.provider === 'google_adk'
                    ? onInvestigateGoogleAdk
                    : session.provider === 'claude_desktop'
                    ? onInvestigateClaudeDesktop
                    : session.provider === 'cursor'
                    ? onInvestigateCursor
                    : onInvestigateCodex)?.(session.routeKey)
                }
                disabled={
                  !(session.provider === 'google_adk'
                    ? onInvestigateGoogleAdk
                    : session.provider === 'claude_desktop'
                    ? onInvestigateClaudeDesktop
                    : session.provider === 'cursor'
                    ? onInvestigateCursor
                    : onInvestigateCodex)
                }
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.brief.inspectSession',
                  { defaultMessage: 'Inspect session {title}', values: { title: session.title } }
                )}
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.brief.inspectEvidence',
                  { defaultMessage: 'Inspect evidence' }
                )}
              </EuiButtonEmpty>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};
