/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import type { AgentConfiguredTool, AgentInventoryItem, AgentToolCall } from './types';
import { useAgentActivity } from './use_agent_activity';
import { useAgentActor } from './use_agent_actor';
import { AgentEvidenceButton, AgentOutcome, AgentTimestamp } from './agent_evidence';
import { AgentExecutionGraph } from './agent_execution_graph';
import { useSecurityFindings } from '../security_findings/use_security_findings';
import type { SecurityFindingScope } from '../security_findings/types';
import { ProviderIcon } from './provider_icon';
import { AgentContentInspector } from './agent_content_inspector';
import { useAgentConversations } from './use_agent_conversations';
import { findInvocationConversation } from './agent_conversations';

export const AgentDossier: React.FC<{
  agent: AgentInventoryItem;
  initialInvocationId?: string;
  onInvestigate?: () => void;
}> = ({ agent, initialInvocationId, onInvestigate }) => {
  const spaceId = useSpaceId();
  const result = useAgentActivity(spaceId, agent);
  const conversations = useAgentConversations(spaceId, agent.id);
  const [contentSelection, setContentSelection] = useState<{
    invocationId: string;
    callId?: string;
  }>();
  const [tab, setTab] = useState<'activity' | 'access'>('activity');
  const [selectedInvocationId, setSelectedInvocationId] = useState(initialInvocationId);
  const { activity } = result;
  const invocation = selectedInvocationId
    ? activity?.invocations.find((item) => item.id === selectedInvocationId)
    : activity?.invocations[0];
  const securityScope: SecurityFindingScope = {
    type: 'agent',
    provider: 'agent_builder',
    agentId: agent.id,
    traceId: invocation?.traceId ?? '',
    sessionId: invocation ? `${invocation.traceId}:${invocation.spanId}` : '',
  };
  const securityResult = useSecurityFindings(
    securityScope,
    invocation && result.status !== 'unavailable' ? spaceId : undefined
  );
  const toolCalls = useMemo(
    () =>
      activity?.toolCalls.filter(
        (call) =>
          call.invocationSpanId === invocation?.spanId && call.traceId === invocation?.traceId
      ) ?? [],
    [activity?.toolCalls, invocation?.spanId, invocation?.traceId]
  );

  const conversation = invocation
    ? findInvocationConversation(invocation, conversations.conversations)
    : undefined;
  const actor = useAgentActor(
    spaceId,
    agent.id,
    tab === 'activity' ? conversation?.id : undefined,
    invocation
  );

  const configuredColumns: Array<EuiBasicTableColumn<AgentConfiguredTool>> = [
    {
      field: 'id',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.tool', {
        defaultMessage: 'Tool',
      }),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.connector', {
        defaultMessage: 'Connector reference',
      }),
      render: (tool: AgentConfiguredTool) => tool.connectorId ?? '—',
    },
    {
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.configuration',
        { defaultMessage: 'Configuration' }
      ),
      render: (tool: AgentConfiguredTool) => (
        <EuiBadge color="hollow">
          {tool.definitionAvailable
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.configured',
                { defaultMessage: 'Configured' }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.toolUnavailable',
                {
                  defaultMessage: 'Definition unavailable',
                }
              )}
        </EuiBadge>
      ),
    },
  ];
  const callColumns: Array<EuiBasicTableColumn<AgentToolCall>> = [
    {
      field: 'toolName',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.observedTool',
        { defaultMessage: 'Observed tool' }
      ),
      render: (name: string, call: AgentToolCall) => (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() =>
            invocation && setContentSelection({ invocationId: invocation.id, callId: call.id })
          }
        >
          {call.nameRedacted
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.redactedTool',
                { defaultMessage: 'Custom tool · name withheld' }
              )
            : name}
        </EuiButtonEmpty>
      ),
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.outcome', {
        defaultMessage: 'Outcome',
      }),
      render: (call: AgentToolCall) => <AgentOutcome outcome={call.outcome} />,
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.time', {
        defaultMessage: 'Observed at',
      }),
      render: (call: AgentToolCall) => <AgentTimestamp value={call.timestamp} />,
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.evidence', {
        defaultMessage: 'Evidence',
      }),
      render: (call: AgentToolCall) => <AgentEvidenceButton event={call} />,
    },
  ];

  return (
    <div data-test-subj="entityIntelligenceAgentDossier">
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <ProviderIcon provider="elastic" size={28} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList
            compressed
            type="inline"
            listItems={[
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.invocationCount',
                  { defaultMessage: 'Invocations in 30 days' }
                ),
                description: activity?.totalInvocations.toLocaleString() ?? '—',
              },
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.createdBy',
                  { defaultMessage: 'Created by' }
                ),
                description:
                  agent.owner?.name ??
                  agent.owner?.id ??
                  i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.notRecorded',
                    { defaultMessage: 'Not recorded' }
                  ),
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={result.refetch}
            isLoading={result.isRefreshing}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.refreshActivity',
              { defaultMessage: 'Refresh activity' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.unscored', {
              defaultMessage: 'Risk unscored',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      {onInvestigate && (
        <>
          <EuiSpacer size="m" />
          <EuiButton size="s" onClick={onInvestigate} iconType="graphApp">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.exploreExecution',
              { defaultMessage: 'Explore executions' }
            )}
          </EuiButton>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiTabs>
        <EuiTab
          isSelected={tab === 'activity'}
          onClick={() => setTab('activity')}
          data-test-subj="agentActivityTab"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.activityTab',
            { defaultMessage: 'Observed activity' }
          )}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'access'}
          onClick={() => setTab('access')}
          data-test-subj="agentAccessTab"
        >
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.accessTab', {
            defaultMessage: 'Configured access',
          })}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {tab === 'access' ? (
        <>
          {agent.description && (
            <>
              <EuiText size="s">
                <p>{agent.description}</p>
              </EuiText>
              <EuiSpacer size="m" />
            </>
          )}
          <EuiDescriptionList
            compressed
            type="column"
            listItems={[
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.agentId',
                  { defaultMessage: 'Agent ID' }
                ),
                description: agent.id,
              },
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.visibility',
                  { defaultMessage: 'Agent visibility' }
                ),
                description: agent.accessMode ?? '—',
              },
            ]}
          />
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.configuredMeaning',
                {
                  defaultMessage:
                    'Current tool assignments describe agent configuration. They do not establish historical permission, credential scope, or resource access.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {agent.enableElasticCapabilities && (
            <>
              <KbnInfoCallout
                size="s"
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.capabilitiesEnabled',
                  {
                    defaultMessage: 'Dynamic Elastic capabilities are enabled',
                  }
                )}
              >
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.capabilitiesMeaning',
                    {
                      defaultMessage:
                        'Additional tools can be selected at runtime. Explicit assignments below are not the complete set of possible capabilities.',
                    }
                  )}
                </p>
              </KbnInfoCallout>
              <EuiSpacer size="m" />
            </>
          )}
          <EuiInMemoryTable
            tableCaption={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.configuredToolsCaption',
              {
                defaultMessage: 'Current explicitly configured agent tools',
              }
            )}
            items={agent.configuredTools}
            columns={configuredColumns}
            itemId="id"
            pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25] }}
            noItemsMessage={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.noConfiguredTools',
              {
                defaultMessage: 'No explicit tool assignments.',
              }
            )}
          />
          {agent.connectorIds.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                listItems={[
                  {
                    title: i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.configuredConnectors',
                      {
                        defaultMessage: 'Configured connector references',
                      }
                    ),
                    description: agent.connectorIds.join(', '),
                  },
                ]}
              />
            </>
          )}
          <EuiSpacer size="m" />
          <KbnInfoCallout
            size="s"
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.grantUnknown',
              {
                defaultMessage: 'Delegated credential scope is not established',
              }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.grantUnknownDescription',
                {
                  defaultMessage:
                    'A connector reference identifies configuration. Effective permissions and delegation grants require authorization evidence from the executing system.',
                }
              )}
            </p>
          </KbnInfoCallout>
        </>
      ) : (
        <>
          {result.isLoading ? (
            <EuiSkeletonText lines={5} />
          ) : result.status === 'unavailable' ? (
            <KbnWarningCallout
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.activityUnavailable',
                {
                  defaultMessage: 'Execution evidence unavailable',
                }
              )}
            >
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.activityUnavailableDescription',
                  {
                    defaultMessage:
                      'The trace query could not be completed. Check trace access and collection health, then retry.',
                  }
                )}
              </p>
            </KbnWarningCallout>
          ) : selectedInvocationId && !invocation ? (
            <KbnWarningCallout
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.selectedInvocationUnavailable',
                { defaultMessage: 'The selected invocation is not in the loaded activity' }
              )}
            >
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.selectedInvocationUnavailableDescription',
                  {
                    defaultMessage:
                      'Invocation {invocationId} was not returned. It may be outside the loaded sample or no longer accessible. Refresh activity to retry.',
                    values: { invocationId: selectedInvocationId },
                  }
                )}
              </p>
              {activity?.invocations[0] && (
                <EuiButtonEmpty
                  size="s"
                  onClick={() => {
                    setSelectedInvocationId(activity.invocations[0].id);
                    setContentSelection(undefined);
                  }}
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.showLatestInvocation',
                    { defaultMessage: 'Show latest available invocation' }
                  )}
                </EuiButtonEmpty>
              )}
            </KbnWarningCallout>
          ) : !invocation ? (
            <KbnInfoCallout
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.agents.noActivity',
                {
                  defaultMessage: 'No recorded invocations in this window',
                }
              )}
            >
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.noActivityDescription',
                  {
                    defaultMessage:
                      'No matching agent invocations were returned. This does not establish that the agent was inactive; collection and identity coverage may be incomplete.',
                  }
                )}
              </p>
            </KbnInfoCallout>
          ) : (
            <>
              {(result.status === 'partial' || activity?.truncated) && (
                <>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.boundedEvidenceInline',
                      {
                        defaultMessage:
                          '{shown, number} of {total, number} invocations shown. Trace limits or missing parents may leave tool calls unattributed.',
                        values: {
                          shown: activity?.sampledInvocations ?? 0,
                          total: activity?.totalInvocations ?? 0,
                        },
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="s" />
                </>
              )}
              <EuiSelect
                fullWidth
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.selectInvocation',
                  {
                    defaultMessage: 'Select an agent invocation',
                  }
                )}
                value={invocation.id}
                onChange={(event) => {
                  setSelectedInvocationId(event.target.value);
                  setContentSelection(undefined);
                }}
                options={activity?.invocations.map((item) => ({
                  value: item.id,
                  text: `${
                    findInvocationConversation(item, conversations.conversations)?.title ??
                    item.timestamp
                  } · ${item.spanId}`,
                }))}
                data-test-subj="agentInvocationSelect"
              />
              <EuiSpacer size="m" />
              <AgentExecutionGraph
                agent={agent}
                invocation={invocation}
                toolCalls={toolCalls}
                security={{ scope: securityScope, result: securityResult, spaceId }}
                conversationTitle={conversation?.title}
                resolvedActor={actor.actor}
                isActorLoading={actor.isLoading}
                onSelectInvocation={() => setContentSelection({ invocationId: invocation.id })}
                onSelectTool={(call) =>
                  setContentSelection({ invocationId: invocation.id, callId: call.id })
                }
              />
              {conversations.partial && (
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.agents.conversationCoverage',
                    {
                      defaultMessage:
                        'Conversation titles cover the latest 100 accessible conversations for this agent.',
                    }
                  )}
                </EuiText>
              )}
              <EuiSpacer size="m" />
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <h3>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.agents.observedCalls',
                        {
                          defaultMessage: 'Tool calls attributed to this invocation',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AgentEvidenceButton event={invocation} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiInMemoryTable
                tableCaption={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.toolCallsCaption',
                  {
                    defaultMessage: 'Observed tool calls linked to the selected invocation',
                  }
                )}
                items={toolCalls}
                columns={callColumns}
                itemId="id"
                pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25] }}
                noItemsMessage={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.agents.noToolCalls',
                  {
                    defaultMessage:
                      'No tool calls could be attributed to this invocation in the retrieved evidence.',
                  }
                )}
              />
              {activity?.privacy.hasRedactedToolNames && (
                <>
                  <EuiSpacer size="m" />
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.agents.privacyNotice',
                        {
                          defaultMessage:
                            'Trace privacy settings withhold some tool names or identity values. Withheld values are not reconstructed.',
                        }
                      )}
                    </p>
                  </EuiText>
                </>
              )}
            </>
          )}
        </>
      )}
      {invocation &&
        result.status !== 'unavailable' &&
        contentSelection?.invocationId === invocation.id &&
        (!contentSelection.callId ||
          toolCalls.some((call) => call.id === contentSelection.callId)) && (
          <AgentContentInspector
            spaceId={spaceId}
            agentId={agent.id}
            conversationId={conversation?.id}
            invocation={invocation}
            calls={toolCalls}
            selectedCallId={contentSelection.callId}
            onSelectCall={(callId) => setContentSelection({ invocationId: invocation.id, callId })}
            onClose={() => setContentSelection(undefined)}
          />
        )}
    </div>
  );
};
