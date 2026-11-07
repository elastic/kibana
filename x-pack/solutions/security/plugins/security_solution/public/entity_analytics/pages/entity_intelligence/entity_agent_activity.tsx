/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { APP_UI_ID } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { AgentTimestamp } from './ai_agents/agent_evidence';
import { ProviderIcon } from './ai_agents/provider_icon';
import { securityFindingKey } from './ai_agents/security_graph_model';
import type { IntelligenceEntity } from './common';
import { IntelligencePanel } from './components';
import { FindingDetails } from './security_findings/finding_details';
import { FindingOutcome } from './security_findings/finding_presentation';
import { FindingResponseLink } from './security_findings/finding_response_evidence';
import { getFindingResponse } from './security_findings/response_evidence';
import type { SecurityFindingsResult } from './security_findings/types';
import {
  buildEntityAgentStory,
  entityAgentSessionPath,
  entityRiskInputMatchesFinding,
  type EntityAgentAttribution,
} from './entity_agent_activity_model';
import { useEntityAgentRiskInputs } from './use_entity_agent_risk_inputs';

const attributionLabels: Record<EntityAgentAttribution, string> = {
  authenticated_requester: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.authenticated',
    { defaultMessage: 'Authenticated requester' }
  ),
  local_account: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.localAccount',
    { defaultMessage: 'Local account · requester unverified' }
  ),
  runtime_principal: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.runtimePrincipal',
    { defaultMessage: 'Executing service account' }
  ),
  entity_reference: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.entityReference',
    { defaultMessage: 'Related entity · requester unverified' }
  ),
  unverified_account: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.unverified',
    { defaultMessage: 'Recorded account · authentication unverified' }
  ),
};

const providerNames = {
  google_adk: 'Google ADK',
  codex: 'Codex',
  cursor: 'Cursor',
  claude_desktop: 'Claude Desktop',
  agent_builder: 'Agent Builder',
};

/** Shows agent actions attributed to an entity, with separately verified native risk contributions. */
export const EntityAgentActivity: React.FC<{
  entity: IntelligenceEntity;
  result: SecurityFindingsResult;
  history?: RiskScoreHistoryResponse;
  historyLoading?: boolean;
  onRefreshRisk?: () => void;
  compact?: boolean;
  onShowAgentActivity?: () => void;
}> = ({
  entity,
  result,
  history,
  historyLoading = false,
  onRefreshRisk,
  compact = false,
  onShowAgentActivity,
}) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const accordionId = useGeneratedHtmlId({ prefix: 'entityAgentEvidence' });
  const [expanded, setExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const loading = result.isLoading || result.isRefreshing;
  const spaceId = useSpaceId();
  const resolution = useEntityAgentRiskInputs(
    entity,
    loading || result.unavailable ? [] : result.findings,
    history,
    spaceId
  );
  const story = useMemo(
    () =>
      buildEntityAgentStory(
        entity,
        loading || result.unavailable ? [] : result.findings,
        history,
        resolution
      ),
    [entity, loading, result.unavailable, result.findings, history, resolution]
  );
  const selected = result.findings.find((finding) => securityFindingKey(finding) === selectedKey);
  if (!loading && !result.unavailable && story.actions.length === 0) return null;

  if (compact) {
    const refreshLabel = i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.refresh',
      { defaultMessage: 'Refresh evidence' }
    );
    const blockedCount = story.actions.filter(
      (action) => action.finding.outcome === 'blocked'
    ).length;
    const riskReady = story.riskInputsAvailable && resolution.complete;
    const scoredActions = story.actions.filter((action) => action.riskInputs.length > 0);
    const providers = [
      ...new Set(story.actions.flatMap((action) => action.finding.agent?.provider ?? [])),
    ];
    return (
      <IntelligencePanel accentColor={euiTheme.colors.primary} data-test-subj="entityAgentActivity">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.compactTitle',
                  { defaultMessage: 'Agent activity' }
                )}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={refreshLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="refresh"
                isLoading={loading || historyLoading || resolution.isLoading}
                aria-label={refreshLabel}
                onClick={() => {
                  result.refetch();
                  onRefreshRisk?.();
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {loading ? (
          <EuiSkeletonText lines={2} />
        ) : result.unavailable ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.unavailable',
              {
                defaultMessage:
                  'Agent attribution evidence is unavailable. Refresh findings to retry.',
              }
            )}
          </EuiText>
        ) : (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
              {providers.map((provider) => (
                <EuiFlexItem key={provider} grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <ProviderIcon
                        provider={provider === 'agent_builder' ? 'elastic' : provider}
                        size={20}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">{providerNames[provider]}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.count',
                    {
                      defaultMessage: '{count, plural, one {# action} other {# actions}}',
                      values: { count: story.actions.length },
                    }
                  )}
                </EuiBadge>
              </EuiFlexItem>
              {blockedCount > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="primary" iconType="shield">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.blockedCount',
                      { defaultMessage: '{count} blocked', values: { count: blockedCount } }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {riskReady && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.scoredTooltip',
                      {
                        defaultMessage:
                          'Agent alerts matched to returned inputs from the latest native risk calculation. One action can produce multiple alerts; additional inputs may not be returned.',
                      }
                    )}
                  >
                    <EuiBadge
                      color={story.matchedAlertCount > 0 ? 'warning' : 'hollow'}
                      tabIndex={0}
                    >
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.scoredCount',
                        {
                          defaultMessage:
                            '{count, plural, one {# scored alert} other {# scored alerts}}',
                          values: { count: story.matchedAlertCount },
                        }
                      )}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {result.partial && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.sampledCounts',
                    { defaultMessage: 'Counts reflect loaded evidence.' }
                  )}
                </EuiText>
              </>
            )}
            {onShowAgentActivity && (
              <>
                <EuiSpacer size="m" />
                <EuiButton size="s" iconType="graphApp" fullWidth onClick={onShowAgentActivity}>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.showOnGraph',
                    { defaultMessage: 'Show agent activity' }
                  )}
                </EuiButton>
              </>
            )}
            <EuiSpacer size="m" />
            <EuiAccordion
              id={`${accordionId}-risk`}
              buttonContent={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.riskEvidence',
                { defaultMessage: 'Risk evidence' }
              )}
              paddingSize="s"
            >
              <EuiText size="xs" color="subdued">
                {historyLoading || resolution.isLoading ? (
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.loadingRisk',
                      { defaultMessage: 'Checking risk calculation' }
                    )}
                  </p>
                ) : !riskReady ? (
                  <p>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.riskUnavailable',
                      { defaultMessage: 'Risk contribution not verified' }
                    )}
                  </p>
                ) : (
                  story.latestScore && (
                    <>
                      <p>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.compactScore',
                          {
                            defaultMessage: 'Calculated risk: {score} / 100',
                            values: { score: story.latestScore.calculated_score_norm.toFixed(1) },
                          }
                        )}
                        {' · '}
                        <AgentTimestamp value={story.latestScore['@timestamp']} />
                      </p>
                      <p>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.exactJoin',
                          {
                            defaultMessage:
                              'Risk inclusion requires the same alert ID and index in the latest native calculation. Contribution values below are engine inputs, not additional points on the normalized score.',
                          }
                        )}
                      </p>
                      {story.latestScore.inputs &&
                        (story.latestScore.category_1_count ?? 0) >
                          story.latestScore.inputs.length && (
                          <p>
                            {i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.riskInputLimit',
                              {
                                defaultMessage:
                                  'The native score used {scored, plural, one {# alert} other {# alerts}}; {returned, plural, one {# contribution record was returned} other {# contribution records were returned}}. Other alerts may also contribute.',
                                values: {
                                  scored: story.latestScore.category_1_count,
                                  returned: story.latestScore.inputs.length,
                                },
                              }
                            )}
                          </p>
                        )}
                    </>
                  )
                )}
              </EuiText>
              {scoredActions.map((action) =>
                action.findings.map((finding) => {
                  const input = action.riskInputs.find((item) =>
                    entityRiskInputMatchesFinding(item, finding, resolution)
                  );
                  return input ? (
                    <div key={securityFindingKey(finding)}>
                      <EuiButtonEmpty
                        size="xs"
                        flush="left"
                        iconType="shield"
                        onClick={() => setSelectedKey(securityFindingKey(finding))}
                      >
                        {finding.policy?.name ?? finding.rule.name}
                      </EuiButtonEmpty>
                      {input.contribution_score !== undefined && (
                        <EuiText size="xs" color="subdued">
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.rawContribution',
                            {
                              defaultMessage: 'Raw risk contribution: {value}',
                              values: { value: input.contribution_score.toFixed(2) },
                            }
                          )}
                        </EuiText>
                      )}
                    </div>
                  ) : null;
                })
              )}
            </EuiAccordion>
          </>
        )}
        {selected && !loading && !result.unavailable && (
          <FindingDetails
            finding={selected}
            onClose={() => setSelectedKey(undefined)}
            entityTargets={[entity]}
          />
        )}
      </IntelligencePanel>
    );
  }

  const rowStyle = css`
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
    & + & {
      margin-top: ${euiTheme.size.s};
    }
  `;
  const chainStyle = css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-width: 0;
  `;
  const wrappingText = css`
    overflow-wrap: anywhere;
    min-width: 0;
  `;

  return (
    <IntelligencePanel accentColor={euiTheme.colors.primary} data-test-subj="entityAgentActivity">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              <EuiIcon type="graphApp" aria-hidden={true} />{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.title',
                {
                  defaultMessage: 'Agent activity & risk',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {story.actions.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.count',
                {
                  defaultMessage: '{count, plural, one {# action} other {# actions}}',
                  values: { count: story.actions.length },
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            isLoading={loading || historyLoading || resolution.isLoading}
            onClick={() => {
              result.refetch();
              onRefreshRisk?.();
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.refresh',
              { defaultMessage: 'Refresh evidence' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {loading ? (
        <EuiSkeletonText lines={3} />
      ) : result.unavailable ? (
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.unavailable',
            {
              defaultMessage:
                'Agent attribution evidence is unavailable. Refresh findings to retry.',
            }
          )}
        </EuiText>
      ) : (
        <>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.summary',
                {
                  defaultMessage:
                    'Follow the account through the agent to the policy match. A policy match records behavior; it does not establish the person’s intent.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {story.latestScore && (
            <>
              <EuiText size="xs">
                <p>
                  <EuiIcon type="visGauge" aria-hidden={true} />{' '}
                  {story.riskInputsAvailable && resolution.complete
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.scoreSummary',
                        {
                          defaultMessage:
                            'Latest calculated risk: {score} / 100 · {count, plural, one {# matched agent alert} other {# matched agent alerts}}',
                          values: {
                            score: story.latestScore.calculated_score_norm.toFixed(1),
                            count: story.matchedAlertCount,
                          },
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.scoreWithoutInputs',
                        {
                          defaultMessage:
                            'Latest calculated risk: {score} / 100 · contribution details unavailable',
                          values: { score: story.latestScore.calculated_score_norm.toFixed(1) },
                        }
                      )}{' '}
                  <AgentTimestamp value={story.latestScore['@timestamp']} />
                </p>
              </EuiText>
              {story.latestScore.inputs &&
                (story.latestScore.category_1_count ?? 0) > story.latestScore.inputs.length && (
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.riskInputLimit',
                      {
                        defaultMessage:
                          'The native score used {scored, plural, one {# alert} other {# alerts}}; {returned, plural, one {# contribution record was returned} other {# contribution records were returned}}. Other alerts may also contribute.',
                        values: {
                          scored: story.latestScore.category_1_count,
                          returned: story.latestScore.inputs.length,
                        },
                      }
                    )}
                  </EuiText>
                )}
              <EuiSpacer size="s" />
            </>
          )}
          {(expanded ? story.actions : story.actions.slice(0, 3)).map((action, index) => {
            const { finding } = action;
            const agent = finding.agent;
            if (!agent) return null;
            const sessionPath = entityAgentSessionPath(finding);
            const sessionUrl = sessionPath
              ? application.getUrlForApp(APP_UI_ID, { path: sessionPath })
              : undefined;
            const responseFinding = action.findings.find((item) => getFindingResponse(item));
            return (
              <div key={action.key} css={rowStyle} data-test-subj="entityAgentAction">
                <div css={chainStyle}>
                  <EuiIcon
                    type={EntityIconByType[entity.type]}
                    color="primary"
                    aria-hidden={true}
                  />
                  <EuiText size="xs" css={wrappingText}>
                    <strong>{entity.identifierValue}</strong>
                  </EuiText>
                  <EuiIcon type="sortRight" aria-hidden={true} />
                  <ProviderIcon
                    provider={agent.provider === 'agent_builder' ? 'elastic' : agent.provider}
                    size={24}
                  />
                  <EuiText size="xs">
                    <strong>{providerNames[agent.provider]}</strong>
                  </EuiText>
                  <EuiIcon type="sortRight" aria-hidden={true} />
                  <EuiText size="xs" css={wrappingText}>
                    <strong>{finding.invocation?.toolName ?? finding.title}</strong>
                  </EuiText>
                  <FindingOutcome finding={finding} />
                </div>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued" css={wrappingText}>
                  <p>{attributionLabels[action.attribution]}</p>
                  {finding.invocation?.runtimePrincipal && (
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.executedAs',
                        {
                          defaultMessage: 'Agent executed as {principal}',
                          values: { principal: finding.invocation.runtimePrincipal },
                        }
                      )}
                    </p>
                  )}
                </EuiText>
                <EuiSpacer size="s" />
                <EuiBadge color={action.riskInputs.length ? 'warning' : 'hollow'}>
                  {action.riskInputs.length
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.included',
                        { defaultMessage: 'Included in latest risk score' }
                      )
                    : historyLoading || resolution.isLoading
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.loadingRisk',
                        { defaultMessage: 'Checking risk calculation' }
                      )
                    : action.riskInputsVerified
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.notIncluded',
                        { defaultMessage: 'Not among returned risk inputs' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.riskUnavailable',
                        { defaultMessage: 'Risk contribution not verified' }
                      )}
                </EuiBadge>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id={`${accordionId}-${index}`}
                  buttonContent={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.evidence',
                    {
                      defaultMessage:
                        '{count, plural, one {# policy record} other {# policy records}} & risk evidence',
                      values: { count: action.findings.length },
                    }
                  )}
                  paddingSize="s"
                >
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.exactJoin',
                        {
                          defaultMessage:
                            'Risk inclusion requires the same alert ID and index in the latest native calculation. Contribution values below are engine inputs, not additional points on the normalized score.',
                        }
                      )}
                    </p>
                  </EuiText>
                  {action.findings.map((evidence) => {
                    const input = action.riskInputs.find((item) =>
                      entityRiskInputMatchesFinding(item, evidence, resolution)
                    );
                    return (
                      <div
                        key={securityFindingKey(evidence)}
                        css={css`
                          margin-top: ${euiTheme.size.s};
                        `}
                      >
                        <EuiButtonEmpty
                          size="xs"
                          iconType="shield"
                          flush="left"
                          onClick={() => setSelectedKey(securityFindingKey(evidence))}
                        >
                          {evidence.policy?.name ?? evidence.rule.name}
                        </EuiButtonEmpty>
                        {input && (
                          <EuiText size="xs">
                            {input.contribution_score !== undefined
                              ? i18n.translate(
                                  'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.rawContribution',
                                  {
                                    defaultMessage: 'Raw risk contribution: {value}',
                                    values: { value: input.contribution_score.toFixed(2) },
                                  }
                                )
                              : i18n.translate(
                                  'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.inputConfirmed',
                                  { defaultMessage: 'Alert confirmed in native risk inputs' }
                                )}
                          </EuiText>
                        )}
                      </div>
                    );
                  })}
                </EuiAccordion>
                <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                  {sessionUrl && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType="graphApp"
                        href={sessionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.openSession',
                          { defaultMessage: 'Open agent session' }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                  {responseFinding && (
                    <EuiFlexItem grow={false}>
                      <FindingResponseLink finding={responseFinding} />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <AgentTimestamp value={finding.timestamp} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            );
          })}
          {story.actions.length > 3 && (
            <EuiButtonEmpty size="xs" onClick={() => setExpanded(!expanded)}>
              {expanded
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.showLess',
                    { defaultMessage: 'Show fewer actions' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.showMore',
                    {
                      defaultMessage: 'Show all {count} actions',
                      values: { count: story.actions.length },
                    }
                  )}
            </EuiButtonEmpty>
          )}
          {result.partial && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.entityAgent.partial',
                  {
                    defaultMessage:
                      'Based on the loaded alert sample. Other actions and risk contributions may be outside this view.',
                  }
                )}
              </EuiText>
            </>
          )}
        </>
      )}
      {selected && !loading && !result.unavailable && (
        <FindingDetails
          finding={selected}
          onClose={() => setSelectedKey(undefined)}
          entityTargets={[entity]}
        />
      )}
    </IntelligencePanel>
  );
};
