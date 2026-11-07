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
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AiPolicyDetectorStatusResponse,
  AiPolicyProvider,
} from '../../../../../common/entity_intelligence/ai_policies';
import { AgentTimestamp } from '../ai_agents/agent_evidence';
import { ProviderIcon } from '../ai_agents/provider_icon';
import { policyProviderLabels } from './policy_form';

const providers: AiPolicyProvider[] = [
  'cursor',
  'agent_builder',
  'codex',
  'claude_desktop',
  'google_adk',
];

export const PolicyCoverage: React.FC<{
  data?: AiPolicyDetectorStatusResponse;
  loading: boolean;
  unavailable: boolean;
  enabledProviders?: readonly AiPolicyProvider[];
}> = ({ data, loading, unavailable, enabledProviders }) => {
  const { euiTheme } = useEuiTheme();
  if (loading) return <EuiSkeletonText lines={3} />;
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.securitySolution.entityIntelligence.policies.coverage.title', {
            defaultMessage: 'Detection coverage',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m">
        {providers.map((provider) => {
          const source = data?.status?.sources.find((item) => item.provider === provider);
          const inactive = enabledProviders !== undefined && !enabledProviders.includes(provider);
          const healthy = !inactive && !unavailable && !data?.stale && source?.status === 'healthy';
          const label = inactive
            ? i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.noEnabledPolicies',
                { defaultMessage: 'No enabled policies' }
              )
            : unavailable
            ? i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.unavailable',
                { defaultMessage: 'Status unavailable' }
              )
            : !source
            ? i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.notReported',
                { defaultMessage: 'Not reporting' }
              )
            : data?.stale
            ? i18n.translate('xpack.securitySolution.entityIntelligence.policies.coverage.stale', {
                defaultMessage: 'Report overdue',
              })
            : source.status === 'healthy'
            ? i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.healthy',
                { defaultMessage: 'Reporting' }
              )
            : source.status === 'partial'
            ? i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.partial',
                { defaultMessage: 'Partial coverage' }
              )
            : source.status === 'error'
            ? i18n.translate('xpack.securitySolution.entityIntelligence.policies.coverage.error', {
                defaultMessage: 'Collector error',
              })
            : i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.coverage.sourceUnavailable',
                { defaultMessage: 'Source unavailable' }
              );
          return (
            <EuiFlexItem key={provider}>
              <EuiPanel
                hasShadow={false}
                hasBorder
                paddingSize="m"
                css={css`
                  border-top: ${euiTheme.border.width.thick} solid
                    ${inactive
                      ? euiTheme.colors.borderBasePlain
                      : healthy
                      ? euiTheme.colors.success
                      : euiTheme.colors.warning};
                `}
              >
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="spaceBetween"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <ProviderIcon
                        provider={provider === 'agent_builder' ? 'elastic' : provider}
                        size={26}
                      />
                      <strong>{policyProviderLabels[provider]}</strong>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={healthy ? 'success' : 'hollow'}>{label}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                {inactive ? (
                  <EuiText size="s" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityIntelligence.policies.coverage.enableProvider',
                        {
                          defaultMessage:
                            'Add this agent source to an enabled policy to monitor its tool activity.',
                        }
                      )}
                    </p>
                  </EuiText>
                ) : source && !unavailable ? (
                  <>
                    <EuiText size="s">
                      <p>
                        {i18n.translate(
                          'xpack.securitySolution.entityIntelligence.policies.coverage.scanned',
                          {
                            defaultMessage:
                              '{count, plural, one {# tool observation} other {# tool observations}} scanned in the last run',
                            values: { count: source.observationsScanned },
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued">
                      <p>
                        {i18n.translate(
                          'xpack.securitySolution.entityIntelligence.policies.coverage.lastSuccess',
                          { defaultMessage: 'Last successful collection: ' }
                        )}
                        <AgentTimestamp value={source.lastSuccessAt} />
                      </p>
                    </EuiText>
                    {source.message && (
                      <>
                        <EuiSpacer size="xs" />
                        <EuiText size="xs" color="subdued">
                          <p>{source.message}</p>
                        </EuiText>
                      </>
                    )}
                  </>
                ) : (
                  <EuiText size="s" color="subdued">
                    <p>
                      {unavailable
                        ? i18n.translate(
                            'xpack.securitySolution.entityIntelligence.policies.coverage.readError',
                            {
                              defaultMessage:
                                'The collector status could not be read. Refresh to retry.',
                            }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityIntelligence.policies.coverage.noCollector',
                            {
                              defaultMessage:
                                'Waiting for a collector report. A saved policy alone does not establish coverage.',
                            }
                          )}
                    </p>
                  </EuiText>
                )}
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </>
  );
};
