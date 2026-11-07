/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { IntelligencePanel } from '../components';
import type { IntelligenceEntity } from '../common';
import { AgentTimestamp } from '../ai_agents/agent_evidence';
import { ProviderIcon } from '../ai_agents/provider_icon';
import { useSecurityFindings } from './use_security_findings';
import { FindingDetails } from './finding_details';
import { activityLabel, FindingOutcome, severityLabels } from './finding_presentation';
import type { SecurityFinding, SecurityFindingScope, SecurityFindingsResult } from './types';

export { FindingDetails } from './finding_details';
export { activityLabel, FindingOutcome, outcomeLabel } from './finding_presentation';

export interface SecurityFindingsPanelProps {
  scope: SecurityFindingScope;
  result?: SecurityFindingsResult;
  compact?: boolean;
  onInvestigateAgent?: (agent: {
    provider: 'codex' | 'cursor' | 'claude_desktop' | 'google_adk' | 'agent_builder';
    id: string;
    sessionId?: string;
  }) => void;
  onInvestigateEntity?: (entityId: string) => void;
  entityTargets?: ReadonlyArray<Pick<IntelligenceEntity, 'id' | 'name' | 'type'>>;
}

const findingKey = (finding: SecurityFinding): string =>
  JSON.stringify([finding.source.index, finding.source.id]);

const FindingChain: React.FC<{ finding: SecurityFinding }> = ({ finding }) => {
  const { euiTheme } = useEuiTheme();
  const pieces = [
    finding.actor?.name,
    finding.agent?.name ?? finding.host?.name ?? finding.service?.name,
    finding.action ? activityLabel(finding.action) : undefined,
    finding.target,
  ].filter((value): value is string => Boolean(value));
  return pieces.length ? (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: ${euiTheme.size.xs};
        color: ${euiTheme.colors.textSubdued};
        font-size: ${euiTheme.size.m};
        min-width: 0;
      `}
    >
      {pieces.map((piece, index) => (
        <React.Fragment key={`${index}:${piece}`}>
          {index > 0 && <EuiIcon type="sortRight" size="s" aria-hidden={true} />}
          <span
            title={piece}
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 240px;
            `}
          >
            {piece}
          </span>
        </React.Fragment>
      ))}
    </div>
  ) : null;
};

const SecurityFindingsView: React.FC<
  SecurityFindingsPanelProps & { result: SecurityFindingsResult }
> = ({
  scope,
  compact = false,
  onInvestigateAgent,
  onInvestigateEntity,
  entityTargets,
  result,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selection, setSelection] = useState<{ scope: string; finding: string }>();
  const [expandedScope, setExpandedScope] = useState<string>();
  const scopeKey = JSON.stringify(scope);
  const expanded = expandedScope === scopeKey;
  const loading = result.isLoading || result.isRefreshing;
  const findings = result.unavailable || loading ? [] : result.findings;
  const selected =
    selection?.scope === scopeKey
      ? findings.find((finding) => findingKey(finding) === selection.finding)
      : undefined;
  const counts = {
    blocked: findings.filter((finding) => finding.outcome === 'blocked').length,
    violation: findings.filter(
      (finding) => finding.kind === 'policy_violation' && finding.outcome !== 'blocked'
    ).length,
    allowed: findings.filter(
      (finding) => finding.outcome === 'allowed' && finding.kind !== 'policy_violation'
    ).length,
    detected: findings.filter(
      (finding) => finding.outcome === 'unknown' && finding.kind !== 'policy_violation'
    ).length,
  };
  const limit = compact ? 3 : 4;
  const visible = expanded ? findings : findings.slice(0, limit);
  const severityColor = (severity: SecurityFinding['severity']): string =>
    severity === 'critical' || severity === 'high'
      ? euiTheme.colors.danger
      : severity === 'medium'
      ? euiTheme.colors.warning
      : euiTheme.colors.primary;
  return (
    <IntelligencePanel
      accentColor={findings.length ? euiTheme.colors.danger : euiTheme.colors.primary}
      data-test-subj="securityFindingsPanel"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <EuiIcon type="shield" aria-hidden={true} />{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.title',
                { defaultMessage: 'Security findings' }
              )}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.subtitle',
              { defaultMessage: 'Detection alerts · last 30 days' }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            isLoading={result.isRefreshing}
            onClick={() => void result.refetch()}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.refresh',
              { defaultMessage: 'Refresh findings' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {loading ? (
        <EuiSkeletonText lines={3} />
      ) : result.unavailable ? (
        <EuiText size="s" color="subdued">
          <p>
            <EuiIcon type="warning" color="warning" aria-hidden={true} />{' '}
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.unavailable',
              {
                defaultMessage:
                  'Detection evidence is unavailable. Check alert access and retry; no security assessment is shown.',
              }
            )}
          </p>
        </EuiText>
      ) : !findings.length ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.empty',
              {
                defaultMessage:
                  'No matching alerts in the available evidence. Coverage depends on collected events and enabled detection rules.',
              }
            )}
          </p>
        </EuiText>
      ) : (
        <>
          <EuiFlexGroup gutterSize="s" wrap>
            {[
              {
                count: counts.blocked,
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.blockedCount',
                  { defaultMessage: '{count, number} blocked', values: { count: counts.blocked } }
                ),
                color: 'primary',
              },
              {
                count: counts.violation,
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.violationCount',
                  {
                    defaultMessage:
                      '{count, plural, one {# policy violation} other {# policy violations}}',
                    values: { count: counts.violation },
                  }
                ),
                color: 'danger',
              },
              {
                count: counts.allowed,
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.allowedCount',
                  { defaultMessage: '{count, number} allowed', values: { count: counts.allowed } }
                ),
                color: 'hollow',
              },
              {
                count: counts.detected,
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detectedCount',
                  { defaultMessage: '{count, number} detected', values: { count: counts.detected } }
                ),
                color: 'hollow',
              },
            ]
              .filter(({ count }) => count > 0)
              .map(({ label, color }) => (
                <EuiFlexItem key={label} grow={false}>
                  <EuiBadge color={color}>{label}</EuiBadge>
                </EuiFlexItem>
              ))}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {visible.map((finding) => (
            <button
              key={findingKey(finding)}
              type="button"
              data-test-subj="securityFindingRow"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.inspect',
                { defaultMessage: 'Inspect finding: {title}', values: { title: finding.title } }
              )}
              onClick={() => setSelection({ scope: scopeKey, finding: findingKey(finding) })}
              css={css`
                display: grid;
                grid-template-columns: ${compact
                  ? '24px minmax(0, 1fr)'
                  : '28px minmax(0, 1fr) auto'};
                gap: ${euiTheme.size.m};
                align-items: center;
                width: 100%;
                padding: ${euiTheme.size.m};
                margin-top: ${euiTheme.size.s};
                border: ${euiTheme.border.thin};
                border-left: 3px solid ${severityColor(finding.severity)};
                border-radius: ${euiTheme.border.radius.control};
                background: ${transparentize(severityColor(finding.severity), 0.035)};
                color: ${euiTheme.colors.textParagraph};
                text-align: left;
                cursor: pointer;
                &:hover {
                  background: ${transparentize(severityColor(finding.severity), 0.08)};
                }
                &:focus-visible {
                  outline: 2px solid ${euiTheme.colors.primary};
                  outline-offset: 2px;
                }
                @media (max-width: 600px) {
                  grid-template-columns: 24px minmax(0, 1fr);
                }
              `}
            >
              {finding.agent ? (
                <ProviderIcon
                  provider={
                    finding.agent.provider === 'agent_builder' ? 'elastic' : finding.agent.provider
                  }
                  size={24}
                />
              ) : (
                <EuiIcon
                  type={finding.host ? 'storage' : finding.service ? 'gear' : 'user'}
                  size="l"
                  color={severityColor(finding.severity)}
                  aria-hidden={true}
                />
              )}
              <div
                css={css`
                  min-width: 0;
                `}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>
                        {compact &&
                        finding.action &&
                        [
                          'protected_file_access',
                          'unapproved_export',
                          'privilege_change',
                          'suspicious_authentication',
                        ].includes(finding.action)
                          ? activityLabel(finding.action)
                          : finding.title}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <FindingOutcome finding={finding} />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                {compact ? (
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    `}
                  >
                    {finding.target ?? finding.actor?.name ?? finding.host?.name}
                  </EuiText>
                ) : (
                  <FindingChain finding={finding} />
                )}
              </div>
              <div
                css={css`
                  text-align: ${compact ? 'left' : 'right'};
                  ${compact &&
                  css`
                    grid-column: 2;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                  `}
                  @media (max-width: 600px) {
                    grid-column: 2;
                    text-align: left;
                  }
                `}
              >
                <EuiText size="xs" color={severityColor(finding.severity)}>
                  <strong>{severityLabels[finding.severity]}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  <AgentTimestamp value={finding.timestamp} />
                </EuiText>
              </div>
            </button>
          ))}
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {result.partial
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.partial',
                      {
                        defaultMessage:
                          'Counts reflect {count, plural, one {# loaded alert} other {# loaded alerts}}. Additional evidence may be outside this sample.',
                        values: { count: findings.length },
                      }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.countBasis',
                      {
                        defaultMessage:
                          'Counts reflect {count, plural, one {# loaded alert} other {# loaded alerts}}.',
                        values: { count: findings.length },
                      }
                    )}
              </EuiText>
            </EuiFlexItem>
            {findings.length > limit && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => setExpandedScope(expanded ? undefined : scopeKey)}
                >
                  {expanded
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.showLess',
                        { defaultMessage: 'Show fewer' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.showMore',
                        {
                          defaultMessage: 'Show {count, number} more',
                          values: { count: findings.length - limit },
                        }
                      )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
      {selected && (
        <FindingDetails
          finding={selected}
          onClose={() => setSelection(undefined)}
          onInvestigateAgent={onInvestigateAgent}
          onInvestigateEntity={onInvestigateEntity}
          entityTargets={entityTargets}
        />
      )}
    </IntelligencePanel>
  );
};

const FetchedSecurityFindingsPanel: React.FC<SecurityFindingsPanelProps> = (props) => {
  const result = useSecurityFindings(props.scope, useSpaceId());
  return <SecurityFindingsView {...props} result={result} />;
};

export const SecurityFindingsPanel: React.FC<SecurityFindingsPanelProps> = (props) =>
  props.result ? (
    <SecurityFindingsView {...props} result={props.result} />
  ) : (
    <FetchedSecurityFindingsPanel {...props} />
  );
