/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
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
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { IntelligencePanel } from './components';
import { ProviderIcon } from './ai_agents/provider_icon';
import { AgentTimestamp } from './ai_agents/agent_evidence';
import { useSecurityFindings } from './security_findings/use_security_findings';
import { FindingDetails } from './security_findings/finding_details';
import { FindingOutcome, severityLabels } from './security_findings/finding_presentation';
import type { SecurityFinding } from './security_findings/types';
import type { SecurityFindingsPanelProps } from './security_findings/security_findings_panel';
import { groupOverviewFindings } from './overview_findings_model';

export const OverviewFindings: React.FC<Omit<SecurityFindingsPanelProps, 'result' | 'compact'>> = ({
  scope,
  onInvestigateAgent,
  onInvestigateEntity,
  entityTargets,
}) => {
  const { euiTheme } = useEuiTheme();
  const result = useSecurityFindings(scope, useSpaceId());
  const [selected, setSelected] = useState<SecurityFinding>();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<'review' | 'blocked' | 'closed'>();
  const loading = result.isLoading || result.isRefreshing;
  const findings = useMemo(
    () => (result.unavailable || loading ? [] : result.findings),
    [result.unavailable, loading, result.findings]
  );
  const groups = useMemo(() => groupOverviewFindings(findings), [findings]);
  const review = groups.filter((group) => group.category === 'review');
  const blocked = groups.filter((group) => group.category === 'blocked');
  const closed = groups.filter((group) => group.category === 'closed');
  const selectedCategory =
    category ?? (review.length ? 'review' : blocked.length ? 'blocked' : 'closed');
  const categoryGroups = groups.filter((group) => group.category === selectedCategory);
  const visible = showAll ? categoryGroups : categoryGroups.slice(0, 3);
  const hiddenCount = categoryGroups.length - visible.length;
  const categories = [
    {
      id: 'review' as const,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.triage.reviewTab',
        {
          defaultMessage: 'Needs review {count}',
          values: { count: review.length },
        }
      ),
    },
    {
      id: 'blocked' as const,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.triage.blockedTab',
        {
          defaultMessage: 'Blocked {count}',
          values: { count: blocked.length },
        }
      ),
    },
    {
      id: 'closed' as const,
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.triage.closedTab',
        {
          defaultMessage: 'Closed {count}',
          values: { count: closed.length },
        }
      ),
    },
  ];
  const activeSelection = findings.find(
    (finding) =>
      finding.source.index === selected?.source.index && finding.source.id === selected?.source.id
  );
  return (
    <IntelligencePanel data-test-subj="overviewSecurityFindings">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.triage.title', {
                defaultMessage: 'Security priorities',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.triage.subtitle',
                {
                  defaultMessage: 'Detection alerts · last 30 days · repeat alerts grouped',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="refresh"
            isLoading={result.isRefreshing}
            onClick={() => void result.refetch()}
          >
            {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.triage.refresh', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {loading ? (
        <EuiSkeletonText lines={4} />
      ) : result.unavailable ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.triage.unavailable',
              {
                defaultMessage:
                  'Detection evidence is unavailable. Check alert access and refresh to continue.',
              }
            )}
          </p>
        </EuiText>
      ) : !findings.length ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.triage.empty', {
              defaultMessage:
                'No matching alerts in the available evidence. Explore entity risk and behavior below; coverage depends on collected events and enabled rules.',
            })}
          </p>
        </EuiText>
      ) : (
        <>
          <div
            css={css`
              display: flex;
              gap: ${euiTheme.size.s};
              flex-wrap: wrap;
              margin-bottom: ${euiTheme.size.m};
            `}
          >
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selectedCategory === item.id}
                onClick={() => {
                  setCategory(item.id);
                  setShowAll(false);
                }}
                css={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.m};
                  border: ${euiTheme.border.thin};
                  border-color: ${selectedCategory === item.id
                    ? euiTheme.colors.primary
                    : euiTheme.colors.lightShade};
                  border-radius: ${euiTheme.border.radius.medium};
                  color: ${selectedCategory === item.id
                    ? euiTheme.colors.primaryText
                    : euiTheme.colors.textSubdued};
                  background: ${selectedCategory === item.id
                    ? transparentize(euiTheme.colors.primary, 0.1)
                    : 'transparent'};
                  font-size: ${euiTheme.size.m};
                  font-weight: ${euiTheme.font.weight.semiBold};
                  cursor: pointer;
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                    outline-offset: 2px;
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </div>
          {!categoryGroups.length && (
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.triage.categoryEmpty',
                  {
                    defaultMessage: 'No findings in this category in the loaded evidence.',
                  }
                )}
              </p>
            </EuiText>
          )}
          {visible.map((group) => {
            const finding = group.representative;
            const expanded = expandedGroups.includes(group.key);
            const color =
              group.category === 'review'
                ? finding.kind === 'policy_violation'
                  ? euiTheme.colors.danger
                  : euiTheme.colors.warning
                : euiTheme.colors.primary;
            return (
              <div
                key={group.key}
                css={css`
                  border: ${euiTheme.border.thin};
                  border-left: 3px solid ${color};
                  border-radius: ${euiTheme.border.radius.medium};
                  padding: ${euiTheme.size.m};
                  margin-bottom: ${euiTheme.size.s};
                  background: ${transparentize(color, 0.025)};
                `}
              >
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                  `}
                >
                  <span
                    css={css`
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-shrink: 0;
                      width: 32px;
                      height: 32px;
                      border-radius: ${euiTheme.border.radius.medium};
                      background: ${transparentize(color, 0.08)};
                    `}
                  >
                    {finding.agent ? (
                      <ProviderIcon
                        provider={
                          finding.agent.provider === 'agent_builder'
                            ? 'elastic'
                            : finding.agent.provider
                        }
                        size={24}
                      />
                    ) : (
                      <EuiIcon
                        type={finding.host ? 'storage' : finding.service ? 'gear' : 'user'}
                        aria-hidden={true}
                        size="l"
                      />
                    )}
                  </span>
                  <div
                    css={css`
                      flex: 1;
                      min-width: 0;
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(finding)}
                      css={css`
                        text-align: left;
                        color: ${euiTheme.colors.textParagraph};
                        font-weight: ${euiTheme.font.weight.semiBold};
                        cursor: pointer;
                        &:hover {
                          color: ${euiTheme.colors.primaryText};
                        }
                        &:focus-visible {
                          outline: 2px solid ${euiTheme.colors.primary};
                          outline-offset: 3px;
                        }
                      `}
                    >
                      {finding.title}
                    </button>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued">
                      {[
                        finding.actor?.name,
                        finding.agent?.name ?? finding.host?.name ?? finding.service?.name,
                        finding.invocation?.toolName,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
                      <EuiFlexItem grow={false}>
                        <FindingOutcome finding={finding} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {severityLabels[finding.severity]}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          <AgentTimestamp value={finding.timestamp} />
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    onClick={() => setSelected(finding)}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.triage.inspect',
                      {
                        defaultMessage: 'Inspect finding: {title}',
                        values: { title: finding.title },
                      }
                    )}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.triage.inspectButton',
                      { defaultMessage: 'Open' }
                    )}
                  </EuiButtonEmpty>
                </div>
                {group.findings.length > 1 && (
                  <div
                    css={css`
                      margin-left: 40px;
                    `}
                  >
                    <EuiButtonEmpty
                      size="xs"
                      iconType={expanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                      onClick={() =>
                        setExpandedGroups(
                          expanded
                            ? expandedGroups.filter((key) => key !== group.key)
                            : [...expandedGroups, group.key]
                        )
                      }
                    >
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.triage.related',
                        {
                          defaultMessage: '{count, number} related alerts',
                          values: { count: group.findings.length },
                        }
                      )}
                    </EuiButtonEmpty>
                    {expanded &&
                      group.findings.map((item) => (
                        <div key={`${item.source.index}:${item.source.id}`}>
                          <EuiButtonEmpty size="xs" onClick={() => setSelected(item)}>
                            <AgentTimestamp value={item.timestamp} />
                            {' · '}
                            {item.title}
                          </EuiButtonEmpty>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {(showAll || hiddenCount > 0) && (
            <EuiButtonEmpty
              size="s"
              iconType={showAll ? 'chevronSingleUp' : 'chevronSingleDown'}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.triage.fewer',
                    { defaultMessage: 'Show fewer' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.triage.more',
                    {
                      defaultMessage: 'View all {count, number} in this category',
                      values: { count: categoryGroups.length },
                    }
                  )}
            </EuiButtonEmpty>
          )}
        </>
      )}
      <EuiSpacer size="s" />
      {!loading && !result.unavailable && (
        <EuiText size="xs" color="subdued">
          {result.partial
            ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.triage.partial', {
                defaultMessage:
                  'Based on {count, plural, one {# loaded alert} other {# loaded alerts}}. Additional evidence may be outside this sample.',
                values: { count: findings.length },
              })
            : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.triage.basis', {
                defaultMessage:
                  'Based on {count, plural, one {# loaded alert} other {# loaded alerts}}. Each group retains its individual alert evidence.',
                values: { count: findings.length },
              })}
        </EuiText>
      )}
      {activeSelection && (
        <FindingDetails
          finding={activeSelection}
          onClose={() => setSelected(undefined)}
          onInvestigateAgent={onInvestigateAgent}
          onInvestigateEntity={onInvestigateEntity}
          entityTargets={entityTargets}
        />
      )}
    </IntelligencePanel>
  );
};
