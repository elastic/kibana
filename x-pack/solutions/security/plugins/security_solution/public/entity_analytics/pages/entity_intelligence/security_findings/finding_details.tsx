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
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import { externalAgentGroupIdLabel } from '../ai_agents/external_agent_provider';
import { createContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { getRuleDetailsUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useKibana } from '../../../../common/lib/kibana';
import { AgentTimestamp } from '../ai_agents/agent_evidence';
import { ProviderIcon } from '../ai_agents/provider_icon';
import {
  activityLabel,
  FindingOutcome,
  nextStep,
  provenanceLabel,
  severityLabels,
} from './finding_presentation';
import { FindingInvocationEvidence } from './finding_invocation_evidence';
import { FindingPolicyEvidence } from './finding_policy_evidence';
import { FindingResponseEvidence } from './finding_response_evidence';
import { getFindingResponse } from './response_evidence';
import type { SecurityFindingsPanelProps } from './security_findings_panel';
import type { SecurityFinding } from './types';

type FindingDetailsProps = Pick<
  SecurityFindingsPanelProps,
  'onInvestigateAgent' | 'onInvestigateEntity' | 'entityTargets'
> & {
  finding: SecurityFinding;
  onClose: () => void;
};

const notRecorded = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.notRecorded',
  { defaultMessage: 'Not recorded' }
);

const findingHeadline = (finding: SecurityFinding): string => {
  if (finding.outcome === 'unknown') return finding.title;
  if (finding.action === 'protected_file_access' && finding.outcome === 'blocked') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.protectedBlocked',
      {
        defaultMessage: 'Protected file access blocked',
      }
    );
  }
  if (finding.action === 'unapproved_export' && finding.kind === 'policy_violation') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.exportAllowed',
      {
        defaultMessage: 'Prohibited export allowed',
      }
    );
  }
  if (finding.action === 'unapproved_export' && finding.outcome === 'blocked') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.exportBlocked',
      {
        defaultMessage: 'Prohibited export blocked',
      }
    );
  }
  return finding.title;
};

const isNativeMonitorFinding = (finding: SecurityFinding): boolean =>
  finding.invocation?.correlation === 'exact_native_observation' &&
  finding.policy?.mode === 'monitor';

const whatHappened = (finding: SecurityFinding): string => {
  if (isNativeMonitorFinding(finding)) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.nativeMonitorExplanation',
      {
        defaultMessage:
          'The recorded tool call matched this policy. Detection created a finding without blocking the action. Inspect the tool result to see what completed.',
      }
    );
  }
  if (finding.outcome === 'blocked') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.blockedExplanation',
      {
        defaultMessage:
          'The policy denied this action. The enforcing control recorded a blocked outcome.',
      }
    );
  }
  if (finding.kind === 'policy_violation') {
    return finding.policy?.mode === 'monitor'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.monitorExplanation',
          {
            defaultMessage:
              'The policy denied this action, but the control was in monitor mode. The recorded outcome was allowed.',
          }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.enforcementMismatch',
          {
            defaultMessage:
              'An enforcing policy recorded a deny decision, yet the action was allowed. Inspect the source event to establish what executed.',
          }
        );
  }
  if (finding.outcome === 'allowed') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.allowedExplanation',
      {
        defaultMessage:
          'The policy recorded an allow decision and an allowed outcome. The detection is separate from that policy decision.',
      }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.unknownExplanation',
    {
      defaultMessage:
        'A detection rule matched this activity. The evidence does not establish whether a control blocked the action or whether it completed.',
    }
  );
};

const DetailFact: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="s">{children}</EuiText>
  </div>
);

/** Presents the recorded action, policy decision and outcome with exact source evidence. */
export const FindingDetails: React.FC<FindingDetailsProps> = ({
  finding,
  onClose,
  onInvestigateAgent,
  onInvestigateEntity,
  entityTargets = [],
}) => {
  const { euiTheme } = useEuiTheme();
  const { share, application } = useKibana().services;
  const titleId = useGeneratedHtmlId({ prefix: 'securityFinding' });
  const technicalId = useGeneratedHtmlId({ prefix: 'securityFindingTechnical' });
  const locator = share?.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR');
  const timestamp = Date.parse(finding.timestamp);
  const agent = finding.agent;
  const blocked = finding.outcome === 'blocked';
  const violation = finding.kind === 'policy_violation';
  const accent = blocked
    ? euiTheme.colors.primary
    : violation
    ? euiTheme.colors.danger
    : euiTheme.colors.warning;
  const redactor = createContentRedactor();
  [
    finding.reason,
    finding.policy?.reason,
    finding.target,
    finding.title,
    finding.policy?.name,
    finding.policy?.engine,
    finding.policy?.clause?.name,
    finding.policy?.clause?.condition,
    finding.policy?.definition?.description,
    finding.policy?.definition?.scope,
    finding.invocation?.input,
    ...(finding.policy?.definition?.clauses.flatMap((clause) => [clause.name, clause.condition]) ??
      []),
  ].forEach((value) => {
    if (value) redactor.observe(value);
  });
  const redact = (value: string, maximum = 800): string => redactor.redact(value, maximum).text;
  const policyReason = finding.policy?.reason ? redact(finding.policy.reason) : undefined;
  const detectionReason = finding.reason ? redact(finding.reason) : undefined;
  const target = finding.target ? redact(finding.target, 320) : undefined;
  const isFileTarget = Boolean(target && /^(?:\/|~\/|[A-Z]:\\)|\.[a-z0-9]{1,8}$/i.test(target));
  const linkedEntities = [...new Set(finding.entityIds)]
    .flatMap((id) => {
      const entity = entityTargets.find((item) => item.id === id);
      return entity ? [entity] : [];
    })
    .slice(0, 2);
  const references = [finding.source, ...finding.ancestors].filter(
    (source, index, all) =>
      all.findIndex((item) => item.index === source.index && item.id === source.id) === index
  );
  const sourceUrl = (source: { index: string; id: string }): string | undefined => {
    const isAlert = source.index === finding.source.index && source.id === finding.source.id;
    const detectedTime = finding.detectedAt ? Date.parse(finding.detectedAt) : timestamp;
    const referenceTime = isAlert && Number.isFinite(detectedTime) ? detectedTime : timestamp;
    return Number.isFinite(referenceTime)
      ? locator?.getRedirectUrl({
          dataViewSpec: { title: source.index, timeFieldName: '@timestamp' },
          query: { language: 'kuery', query: `_id: ${JSON.stringify(source.id)}` },
          timeRange: {
            from: new Date(referenceTime - 86_400_000).toISOString(),
            to: new Date(referenceTime + 86_400_000).toISOString(),
          },
          columns: ['@timestamp', 'event.action', 'event.outcome', 'kibana.alert.rule.name'],
        })
      : undefined;
  };
  const ruleUrl = finding.rule.id
    ? application?.getUrlForApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(finding.rule.id),
      })
    : undefined;
  const actualOutcome = blocked
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.blockedValue',
        { defaultMessage: 'Blocked' }
      )
    : finding.outcome === 'allowed'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.allowedValue',
        { defaultMessage: 'Allowed' }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.unknownValue',
        { defaultMessage: 'Unknown' }
      );
  const card = css`
    padding: ${euiTheme.size.l};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    min-width: 0;
  `;
  const technicalFacts = [
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.actorSource',
        { defaultMessage: 'Identity source' }
      ),
      value: provenanceLabel(finding.invocation?.actorSource ?? finding.actor?.provenance),
    },
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.actorId',
        { defaultMessage: 'Actor ID' }
      ),
      value: finding.actor?.id ?? notRecorded,
    },
    ...(finding.invocation?.runtimePrincipal
      ? [
          {
            label: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runtime',
              { defaultMessage: 'Executing service account' }
            ),
            value: finding.invocation.runtimePrincipal,
          },
        ]
      : []),
    ...(finding.policy
      ? [
          {
            label: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.engine',
              { defaultMessage: 'Policy engine' }
            ),
            value: finding.policy.engine,
          },
          {
            label: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.policyId',
              { defaultMessage: 'Policy ID' }
            ),
            value: finding.policy.id,
          },
        ]
      : []),
    ...(agent
      ? [
          {
            label:
              agent.provider === 'google_adk'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.agentService',
                    { defaultMessage: 'Agent service' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.agentId',
                    { defaultMessage: 'Agent installation ID' }
                  ),
            value: agent.id,
          },
          {
            label: externalAgentGroupIdLabel(
              agent.provider === 'agent_builder' ? undefined : agent.provider
            ),
            value: agent.sessionId ?? notRecorded,
          },
        ]
      : []),
    ...(finding.traceId
      ? [
          {
            label: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.traceId',
              { defaultMessage: 'Trace ID' }
            ),
            value: finding.traceId,
          },
        ]
      : []),
    {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.ruleId',
        { defaultMessage: 'Rule ID' }
      ),
      value: finding.rule.id ?? notRecorded,
    },
  ];
  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={1020}
      css={css`
        width: min(1020px, calc(100vw - ${euiTheme.size.xl}));
      `}
    >
      <EuiModalHeader
        css={css`
          padding-bottom: ${euiTheme.size.m};
        `}
      >
        <div
          css={css`
            width: 100%;
            min-width: 0;
          `}
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.eyebrow',
              { defaultMessage: 'SECURITY FINDING' }
            )}
          </EuiText>
          <EuiSpacer size="s" />
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.m};
            `}
          >
            <div
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                width: ${euiTheme.size.xxxl};
                height: ${euiTheme.size.xxxl};
                flex-shrink: 0;
                border-radius: ${euiTheme.border.radius.medium};
                background: ${transparentize(accent, 0.12)};
                color: ${accent};
              `}
            >
              <EuiIcon
                type={blocked ? 'shield' : violation ? 'warning' : 'inspect'}
                size="xl"
                aria-hidden={true}
              />
            </div>
            <div
              css={css`
                min-width: 0;
              `}
            >
              <EuiModalHeaderTitle id={titleId}>
                {redact(findingHeadline(finding), 240)}
              </EuiModalHeaderTitle>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <FindingOutcome finding={finding} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.severityBadge',
                      {
                        defaultMessage: '{severity} severity',
                        values: { severity: severityLabels[finding.severity] },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.workflowBadge',
                      {
                        defaultMessage: 'Workflow: {status}',
                        values: { status: finding.status },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </div>
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        <div
          data-test-subj="securityFindingContext"
          css={css`
            ${card};
            border-top: 3px solid ${accent};
            background: linear-gradient(
              115deg,
              ${transparentize(accent, 0.065)},
              ${euiTheme.colors.backgroundBasePlain} 80%
            );
          `}
        >
          <div
            css={css`
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: ${euiTheme.size.l};
              @media (max-width: 650px) {
                grid-template-columns: 1fr;
              }
            `}
          >
            <div
              css={css`
                display: flex;
                gap: ${euiTheme.size.m};
                align-items: center;
                min-width: 0;
              `}
            >
              <EuiIcon type="user" size="l" color="primary" aria-hidden={true} />
              <DetailFact
                label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.actor',
                  { defaultMessage: 'Recorded actor' }
                )}
              >
                <strong>
                  {redact(finding.actor?.name ?? finding.actor?.id ?? notRecorded, 160)}
                </strong>
              </DetailFact>
            </div>
            <div
              css={css`
                display: flex;
                gap: ${euiTheme.size.m};
                align-items: center;
                min-width: 0;
              `}
            >
              {agent ? (
                <ProviderIcon
                  provider={agent.provider === 'agent_builder' ? 'elastic' : agent.provider}
                  size={30}
                />
              ) : (
                <EuiIcon
                  type={finding.host ? 'storage' : 'gear'}
                  size="l"
                  color="primary"
                  aria-hidden={true}
                />
              )}
              <DetailFact
                label={
                  agent
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.agentLabel',
                        { defaultMessage: 'Agent' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.entityLabel',
                        { defaultMessage: 'Entity' }
                      )
                }
              >
                <strong>
                  {redact(
                    agent?.name ??
                      agent?.provider ??
                      finding.host?.name ??
                      finding.service?.name ??
                      notRecorded,
                    160
                  )}
                </strong>
                {agent && finding.host?.name && (
                  <span
                    css={css`
                      color: ${euiTheme.colors.textSubdued};
                    `}
                  >
                    {' '}
                    {'·'} {redact(finding.host.name, 160)}
                  </span>
                )}
              </DetailFact>
            </div>
          </div>
          <div
            css={css`
              margin-top: ${euiTheme.size.l};
              padding-top: ${euiTheme.size.m};
              border-top: ${euiTheme.border.thin};
            `}
          >
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.target',
                { defaultMessage: 'Target' }
              )}
            </EuiText>
            <EuiSpacer size="s" />
            <div
              css={css`
                display: flex;
                gap: ${euiTheme.size.s};
                align-items: flex-start;
                overflow-wrap: anywhere;
              `}
            >
              <EuiIcon
                type={finding.action === 'unapproved_export' ? 'upload' : 'document'}
                color={accent}
                size="l"
                aria-hidden={true}
              />
              <EuiText size="m">
                {isFileTarget && target ? (
                  <EuiCode>{target}</EuiCode>
                ) : (
                  <strong>{target ?? notRecorded}</strong>
                )}
              </EuiText>
            </div>
          </div>
        </div>
        {getFindingResponse(finding) && (
          <>
            <EuiSpacer size="l" />
            <FindingResponseEvidence finding={finding} />
          </>
        )}
        {(finding.agent || finding.invocation) && (
          <>
            <EuiSpacer size="l" />
            <FindingInvocationEvidence
              finding={finding}
              redactor={redactor}
              sourceUrl={finding.invocation ? sourceUrl(finding.invocation.source) : undefined}
            />
          </>
        )}
        <EuiSpacer size="l" />
        <div
          css={css`
            ${card};
            padding: 0;
            overflow: hidden;
          `}
        >
          <div
            css={css`
              padding: ${euiTheme.size.m} ${euiTheme.size.l};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            {finding.policy ? (
              <FindingPolicyEvidence policy={finding.policy} redactor={redactor} />
            ) : (
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.policyMissing',
                  { defaultMessage: 'No explicit control decision was recorded with this alert.' }
                )}
              </EuiText>
            )}
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.policyDecisionTitle',
                  { defaultMessage: 'Policy decision and actual outcome' }
                )}
              </h3>
            </EuiTitle>
          </div>
          <div
            data-test-subj="securityFindingDecision"
            css={css`
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              @media (max-width: 600px) {
                grid-template-columns: 1fr;
              }
            `}
          >
            {[
              {
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.policyDecision',
                  { defaultMessage: 'Policy decision' }
                ),
                value: isNativeMonitorFinding(finding)
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.createFindingValue',
                      { defaultMessage: 'Create finding' }
                    )
                  : finding.policy
                  ? finding.policy.decision === 'deny'
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.denyValue',
                        { defaultMessage: 'Deny' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.allowValue',
                        { defaultMessage: 'Allow' }
                      )
                  : notRecorded,
                icon: 'lock',
                color:
                  finding.policy?.decision === 'deny'
                    ? euiTheme.colors.warning
                    : euiTheme.colors.textParagraph,
              },
              {
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.policyMode',
                  { defaultMessage: 'Policy mode' }
                ),
                value: finding.policy
                  ? finding.policy.mode === 'enforce'
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.enforceValue',
                        { defaultMessage: 'Enforce' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.monitorValue',
                        { defaultMessage: 'Monitor only' }
                      )
                  : notRecorded,
                icon: finding.policy?.mode === 'enforce' ? 'shield' : 'eye',
                color: euiTheme.colors.textParagraph,
              },
              {
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.actualOutcome',
                  { defaultMessage: 'Actual outcome' }
                ),
                value: actualOutcome,
                icon: blocked ? 'shield' : violation ? 'warning' : 'question',
                color: accent,
              },
            ].map((item) => (
              <div
                key={item.label}
                css={css`
                  padding: ${euiTheme.size.l};
                  border-right: ${euiTheme.border.thin};
                  background: ${item.label ===
                  i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.actualOutcome',
                    { defaultMessage: 'Actual outcome' }
                  )
                    ? transparentize(accent, 0.055)
                    : 'transparent'};
                `}
              >
                <EuiText size="xs" color="subdued">
                  {item.label}
                </EuiText>
                <EuiSpacer size="s" />
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                    color: ${item.color};
                  `}
                >
                  <EuiIcon type={item.icon} size="l" aria-hidden={true} />
                  <EuiText size="m">
                    <strong>{item.value}</strong>
                  </EuiText>
                </div>
              </div>
            ))}
          </div>
        </div>
        <EuiSpacer size="l" />
        <div
          css={css`
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${euiTheme.size.l};
            @media (max-width: 650px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          <div>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.whatHappened',
                  { defaultMessage: 'What happened' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{whatHappened(finding)}</p>
            </EuiText>
          </div>
          <div>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.whyItMatters',
                  { defaultMessage: 'Why it matters' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                {policyReason ??
                  detectionReason ??
                  i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.explanationMissing',
                    {
                      defaultMessage:
                        'No policy or detection explanation was recorded. Inspect the source evidence to establish the affected boundary.',
                    }
                  )}
              </p>
            </EuiText>
            {(policyReason || detectionReason) && (
              <EuiText size="xs" color="subdued">
                {policyReason
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.policyExplanation',
                      { defaultMessage: 'Policy explanation' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detectionReason',
                      { defaultMessage: 'Detection reason' }
                    )}
              </EuiText>
            )}
          </div>
        </div>
        <EuiSpacer size="l" />
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${euiTheme.size.l};
            @media (max-width: 600px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          <DetailFact
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.observedAt',
              { defaultMessage: 'Observed at' }
            )}
          >
            <EuiIcon type="clock" aria-hidden={true} /> <AgentTimestamp value={finding.timestamp} />
          </DetailFact>
          <DetailFact
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detectedAt',
              { defaultMessage: 'Detected at' }
            )}
          >
            <EuiIcon type="bell" aria-hidden={true} />{' '}
            {finding.detectedAt ? <AgentTimestamp value={finding.detectedAt} /> : notRecorded}
          </DetailFact>
        </div>
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.evidence',
              { defaultMessage: 'Recorded evidence' }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${euiTheme.size.m};
            @media (max-width: 650px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          {references.map((source, index) => (
            <div
              key={JSON.stringify([source.index, source.id])}
              css={css`
                ${card};
                padding: ${euiTheme.size.m};
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={index === 0 ? 'bell' : 'document'}
                    color="primary"
                    aria-hidden={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>
                      {index === 0
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.alertCard',
                            { defaultMessage: 'Detection alert' }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.sourceCard',
                            { defaultMessage: 'Source event' }
                          )}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  overflow-wrap: anywhere;
                `}
              >
                {index === 0 ? redact(finding.rule.name, 240) : source.index}
              </EuiText>
              <EuiSpacer size="s" />
              {sourceUrl(source) ? (
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  href={sourceUrl(source)}
                  target="_blank"
                  iconType="external"
                >
                  {index === 0
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.openAlert',
                        { defaultMessage: 'Open alert in Discover' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.openSource',
                        { defaultMessage: 'Open source event in Discover' }
                      )}
                </EuiButtonEmpty>
              ) : (
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.linkUnavailable',
                    { defaultMessage: 'Discover link unavailable' }
                  )}
                </EuiText>
              )}
              {index === 0 && ruleUrl && (
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  href={ruleUrl}
                  target="_blank"
                  iconType="external"
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.openRule',
                    { defaultMessage: 'View detection rule' }
                  )}
                </EuiButtonEmpty>
              )}
            </div>
          ))}
        </div>
        <EuiSpacer size="l" />
        <EuiAccordion
          id={technicalId}
          buttonContent={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingDetails.technicalEvidence',
            { defaultMessage: 'Technical evidence and identifiers' }
          )}
          paddingSize="m"
        >
          <dl
            css={css`
              display: grid;
              grid-template-columns: minmax(130px, 1fr) minmax(0, 3fr);
              gap: ${euiTheme.size.s} ${euiTheme.size.m};
              font-size: ${euiTheme.size.m};
              overflow-wrap: anywhere;
            `}
          >
            {technicalFacts.map(({ label, value }) => (
              <React.Fragment key={label}>
                <dt
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                  `}
                >
                  {label}
                </dt>
                <dd>{redact(value, 512)}</dd>
              </React.Fragment>
            ))}
            {finding.action && (
              <>
                <dt
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                  `}
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.action',
                    { defaultMessage: 'Action' }
                  )}
                </dt>
                <dd>{activityLabel(finding.action)}</dd>
              </>
            )}
            {detectionReason && (
              <>
                <dt
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                  `}
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detectionReason',
                    { defaultMessage: 'Detection reason' }
                  )}
                </dt>
                <dd>{detectionReason}</dd>
              </>
            )}
          </dl>
          <EuiSpacer size="m" />
          {references.map((source) => (
            <EuiText
              key={JSON.stringify([source.index, source.id])}
              size="xs"
              color="subdued"
              css={css`
                overflow-wrap: anywhere;
                margin-top: ${euiTheme.size.s};
              `}
            >
              {source.index} {'·'} {source.id}
            </EuiText>
          ))}
        </EuiAccordion>
        <EuiSpacer size="m" />
        <div
          css={css`
            padding: ${euiTheme.size.m};
            border-radius: ${euiTheme.border.radius.control};
            background: ${transparentize(euiTheme.colors.primary, 0.045)};
          `}
        >
          <EuiText size="xs" color="subdued">
            <EuiIcon type="inspect" size="s" aria-hidden={true} /> {nextStep(finding)}
          </EuiText>
        </div>
      </EuiModalBody>
      <EuiModalFooter
        css={css`
          flex-wrap: wrap;
        `}
      >
        {agent && onInvestigateAgent && (agent.provider === 'agent_builder' || agent.sessionId) && (
          <EuiButton
            size="s"
            fill
            iconType="graphApp"
            onClick={() => {
              onClose();
              onInvestigateAgent(agent);
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.investigateAgent',
              { defaultMessage: 'Investigate agent' }
            )}
          </EuiButton>
        )}
        {onInvestigateEntity &&
          linkedEntities.map((entity) => (
            <EuiButtonEmpty
              key={entity.id}
              size="s"
              iconType={
                entity.type === 'user' ? 'user' : entity.type === 'host' ? 'storage' : 'gear'
              }
              onClick={() => {
                onClose();
                onInvestigateEntity(entity.id);
              }}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.investigateLinkedEntity',
                { defaultMessage: 'Investigate {name}', values: { name: entity.name } }
              )}
            </EuiButtonEmpty>
          ))}
        <EuiButtonEmpty size="s" onClick={onClose}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.close',
            { defaultMessage: 'Close' }
          )}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
