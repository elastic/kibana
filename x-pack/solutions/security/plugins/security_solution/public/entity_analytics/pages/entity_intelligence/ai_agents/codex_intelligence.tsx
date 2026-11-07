/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { IntelligencePanel } from '../components';
import { SecurityFindingsPanel } from '../security_findings/security_findings_panel';
import { useSecurityFindings } from '../security_findings/use_security_findings';
import type { SecurityFindingScope } from '../security_findings/types';
import { useCodexSessions, useCodexSessionTools } from './use_codex_sessions';
import { getCodexSessionModels, getCodexSessionTitle, selectCodexBaseline } from './codex_model';
import { analyzeCodexSession } from './codex_behavior';
import { BehaviorPanel } from './behavior_panel';
import { CodexPromptDetails } from './codex_prompt_details';
import {
  externalAgentLabel,
  externalAgentGrouping,
  externalAgentMapLabel,
  claudeDesktopCoverage,
} from './external_agent_provider';
import type { ExternalAgentProvider } from './external_agent_provider';
import { CodexSessionTrail } from './codex_session_trail';
import { CodexEvidence } from './codex_evidence';
import { AgentTimestamp } from './agent_evidence';
import { ProviderIcon } from './provider_icon';
import { CodexSessionGraph } from './session_graph';
import { CodexOutcomeStrip, CodexSessionContext } from './codex_session_context';
import type { CodexSession, CodexToolEvent } from './codex_types';
import type { IntelligenceEntity } from '../common';
import { useGoogleRequesterEntity } from '../hooks/use_google_requester_entity';

const sessionSelectionKey = (session: CodexSession): string =>
  JSON.stringify([session.agentId, session.id]);
const shortSessionId = (id: string): string => `${id.slice(0, 8)}…${id.slice(-4)}`;
const sessionName = getCodexSessionTitle;

export const CodexIntelligence: React.FC<{
  view: 'inventory' | 'explorer';
  provider?: ExternalAgentProvider;
  sessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onInvestigateEntity?: (entity: IntelligenceEntity) => void;
}> = ({ view, sessionId, onSelectSession, onInvestigateEntity, provider = 'codex' }) => {
  const providerLabel = externalAgentLabel(provider);
  const mcpConnection = provider === 'claude_desktop';
  const cloudRun = provider === 'google_adk';
  const grouping = externalAgentGrouping(provider);
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();
  const inventory = useCodexSessions(spaceId, provider);
  const matches = sessionId
    ? inventory.sessions.filter(
        (session) => sessionSelectionKey(session) === sessionId || session.id === sessionId
      )
    : [];
  const selected = sessionId
    ? matches.length === 1
      ? matches[0]
      : undefined
    : inventory.sessions.find((session) => session.role === 'user') ?? inventory.sessions[0];
  const requesterIdentity = useGoogleRequesterEntity(
    cloudRun && !inventory.unavailable ? selected?.googleAdk?.requester : undefined
  );
  const securityScope: SecurityFindingScope = {
    type: 'agent',
    provider,
    agentId: selected?.agentId ?? '',
    sessionId: selected?.id ?? '',
  };
  const securityResult = useSecurityFindings(
    securityScope,
    selected && !inventory.unavailable ? spaceId : undefined
  );
  const calls = useCodexSessionTools(
    spaceId,
    selected,
    securityResult.findings.flatMap((finding) =>
      finding.invocation?.correlation === 'exact_native_observation' &&
      finding.agent?.provider === provider &&
      finding.agent.id === selected?.agentId &&
      finding.agent.sessionId === selected?.id
        ? [finding.invocation.source.id]
        : []
    )
  );
  const baseline = useMemo(
    () => (selected ? selectCodexBaseline(inventory.sessions, selected) : []),
    [inventory.sessions, selected]
  );
  const analysis = useMemo(
    () =>
      selected ? analyzeCodexSession(selected, baseline, calls.events, calls.complete) : undefined,
    [selected, baseline, calls.events, calls.complete]
  );
  const [evidence, setEvidence] = useState<{ session: CodexSession; event?: CodexToolEvent }>();
  const [detailTab, setDetailTab] = useState<
    'map' | 'activity' | 'sessions' | 'identity' | 'prompts'
  >(view === 'inventory' ? 'sessions' : 'map');
  const [toolSelection, setToolSelection] = useState<{ sessionKey: string; name: string }>();
  const selectSession = (session: CodexSession): void => {
    setDetailTab('map');
    onSelectSession(sessionSelectionKey(session));
  };
  const evidenceSession =
    evidence &&
    inventory.sessions.find(
      (session) =>
        session.agentId === evidence.session.agentId &&
        session.id === evidence.session.id &&
        session.source.index === evidence.session.source.index &&
        session.source.id === evidence.session.source.id
    );
  const requestedEvent = evidence?.event;
  const evidenceEvent =
    requestedEvent && !calls.unavailable
      ? calls.events.find(
          (event) =>
            event.agentId === requestedEvent.agentId &&
            event.sessionId === requestedEvent.sessionId &&
            event.source.index === requestedEvent.source.index &&
            event.source.id === requestedEvent.source.id
        )
      : undefined;

  if (inventory.isLoading) return <EuiSkeletonText lines={10} />;
  if (inventory.unavailable)
    return (
      <KbnWarningCallout
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.codex.unavailable',
          {
            defaultMessage: '{provider} telemetry is unavailable',
            values: { provider: providerLabel, grouping },
          }
        )}
      >
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.unavailableDetail',
            {
              defaultMessage:
                'Check read access to the {provider} index in this space, then retry. Previously cached session details are hidden.',
              values: { provider: providerLabel, grouping },
            }
          )}
        </p>
        <EuiButtonEmpty onClick={() => void inventory.refetch()}>
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.retry', {
            defaultMessage: 'Retry',
          })}
        </EuiButtonEmpty>
      </KbnWarningCallout>
    );
  if (!inventory.sessions.length)
    return (
      <IntelligencePanel accentColor={euiTheme.colors.primary}>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.connect', {
              defaultMessage: 'Bring {provider} into Entity Intelligence',
              values: { provider: providerLabel, grouping },
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            {cloudRun
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.connectDetail',
                  {
                    defaultMessage:
                      'Import real Google ADK run evidence and matched Google Cloud audit records. The run map connects the authenticated requester, service identity, exact tool calls and the object versions they consumed.',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.connectDetail',
                  {
                    defaultMessage:
                      'The local collector imports real {provider} {grouping} records, observed tool activity and source references. Captured content is credential-filtered and bounded.',
                    values: { provider: providerLabel, grouping },
                  }
                )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="bash" isCopyable>
          {cloudRun
            ? `node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_google_adk_runs.ts --export-dir /absolute/path/to/export --project YOUR_GOOGLE_PROJECT --space-id ${
                spaceId ?? ''
              }`
            : mcpConnection
            ? `node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_claude_desktop_sessions.ts --audit-file "/absolute/path/to/claude-desktop-bridge/data/events.jsonl" --space-id ${
                spaceId ?? ''
              }`
            : `node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_${provider}_sessions.ts --content redacted --space-id ${
                spaceId ?? ''
              }`}
        </EuiCodeBlock>
        {mcpConnection && (
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.connectInstructions',
                {
                  defaultMessage:
                    'Connect the local MCP bridge in Claude Desktop, restart Claude Desktop, then ask it to look up the customer reference using the tool. Replace the audit-file placeholder with the bridge audit path. Only real tool calls observed by that bridge appear here; ordinary chat history is not collected.',
                }
              )}
            </p>
          </EuiText>
        )}
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.connectAuth',
              {
                defaultMessage:
                  'Run from the Kibana checkout with the local collector credentials set in your environment. See the collector README for supported options and collection limits.',
              }
            )}
          </p>
        </EuiText>
        <EuiButtonEmpty iconType="refresh" onClick={() => void inventory.refetch()}>
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.check', {
            defaultMessage: 'Check for imported activity',
          })}
        </EuiButtonEmpty>
      </IntelligencePanel>
    );
  if (!selected || !analysis)
    return (
      <KbnWarningCallout
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.codex.selectionMissing',
          {
            defaultMessage: 'This activity group is not in the available 30-day inventory',
          }
        )}
      >
        <EuiButtonEmpty onClick={() => onSelectSession(sessionSelectionKey(inventory.sessions[0]))}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.selectAvailable',
            {
              defaultMessage: 'Open the latest available activity',
            }
          )}
        </EuiButtonEmpty>
      </KbnWarningCallout>
    );

  const recordedModels = getCodexSessionModels(selected);
  const multipleModels = recordedModels.length > 1;
  const modelLabel = (session: CodexSession): string =>
    getCodexSessionModels(session).length > 1
      ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.multipleModels', {
          defaultMessage: 'Multiple models',
        })
      : session.model ??
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.codex.modelNotRecorded',
          { defaultMessage: 'Model not recorded' }
        );

  const columns: Array<EuiBasicTableColumn<CodexSession>> = [
    {
      field: 'id',
      name: grouping,
      render: (_id: string, session: CodexSession) => (
        <div>
          <EuiLink onClick={() => selectSession(session)}>{sessionName(session)}</EuiLink>
          <EuiText size="xs" color="subdued">
            <p>{modelLabel(session)}</p>
          </EuiText>
        </div>
      ),
    },
    {
      field: 'start',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.started', {
        defaultMessage: 'First observed',
      }),
      sortable: true,
      render: (time: string) => <AgentTimestamp value={time} />,
    },
    {
      field: 'toolCount',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.calls', {
        defaultMessage: 'Tool observations',
      }),
      sortable: true,
      width: '100px',
    },
    {
      field: 'failures',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.failures', {
        defaultMessage: 'Failures',
      }),
      sortable: true,
      width: '100px',
      render: (value: number) =>
        value ? <EuiBadge color="warning">{value.toLocaleString()}</EuiBadge> : '0',
    },
    {
      field: 'unknowns',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.unknowns', {
        defaultMessage: 'Unknown',
      }),
      sortable: true,
      width: '100px',
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.lastSeen', {
        defaultMessage: 'Last observed',
      }),
      sortable: true,
      render: (time: string) => <AgentTimestamp value={time} />,
    },
    {
      name: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.action', {
        defaultMessage: 'Investigate',
      }),
      width: '100px',
      render: (session: CodexSession) => (
        <EuiButtonEmpty size="xs" onClick={() => selectSession(session)}>
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.open', {
            defaultMessage: 'Open trail',
          })}
        </EuiButtonEmpty>
      ),
    },
  ];
  const installationSessions = inventory.sessions.filter(
    (session) => session.agentId === selected.agentId
  );
  const multipleInstallations =
    new Set(inventory.sessions.map((session) => session.agentId)).size > 1;
  const selectedKey = sessionSelectionKey(selected);
  const activeTool = toolSelection?.sessionKey === selectedKey ? toolSelection.name : '';
  const tabs = [
    {
      id: 'map' as const,
      icon: 'graphApp',
      label: externalAgentMapLabel(provider),
    },
    {
      id: 'activity' as const,
      icon: 'visBarVertical',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.activityTab',
        { defaultMessage: 'Activity' }
      ),
    },
    {
      id: 'prompts' as const,
      icon: 'editorComment',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.content.promptsTab',
        { defaultMessage: 'Prompts' }
      ),
    },
    {
      id: 'sessions' as const,
      icon: 'list',
      label: externalAgentGrouping(provider, true),
    },
    {
      id: 'identity' as const,
      icon: 'user',
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.identityTab',
        { defaultMessage: 'Identity & access' }
      ),
    },
  ];

  return (
    <div data-test-subj="codexIntelligence">
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <ProviderIcon provider={provider} size={40} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.title',
                    { defaultMessage: '{provider}', values: { provider: providerLabel } }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" title={recordedModels.join(', ')}>
                {modelLabel(selected)}
              </EuiBadge>
            </EuiFlexItem>
            {!selected.summaryComplete && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.partial',
                    { defaultMessage: 'Partial snapshot' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <EuiIcon type="user" aria-hidden={true} />{' '}
            {selected.googleAdk?.requester.email ??
              selected.owner?.name ??
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.noOwner',
                { defaultMessage: 'Owner not recorded' }
              )}
            {' · '}
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.sessionCount',
              {
                defaultMessage: '{count, number} {grouping} · last 30 days',
                values: {
                  grouping: externalAgentGrouping(provider, true),
                  count: inventory.sessions.filter(
                    (session) => session.agentId === selected.agentId
                  ).length,
                },
              }
            )}
          </EuiText>
        </EuiFlexItem>
        {requesterIdentity.entity && onInvestigateEntity && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="user"
              data-test-subj="googleAdkOpenRequesterIdentity"
              onClick={() => {
                if (requesterIdentity.entity) onInvestigateEntity(requesterIdentity.entity);
              }}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.openRequesterIdentity',
                { defaultMessage: 'Open requester identity' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="inspect"
            onClick={() => setEvidence({ session: selected })}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.sourceEvidence',
              { defaultMessage: 'Source evidence' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="refresh"
            isLoading={inventory.isRefreshing}
            onClick={() => {
              void inventory.refetch();
              void calls.refetch();
              if (cloudRun) void requesterIdentity.refetch();
            }}
          >
            {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.refresh', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {mcpConnection && (
        <>
          <EuiText size="s" color="subdued">
            <p>{claudeDesktopCoverage()}</p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(240px, 1fr) minmax(230px, 1fr);
          align-items: center;
          gap: ${euiTheme.size.l};
          padding: ${euiTheme.size.m};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          @media (max-width: 800px) {
            grid-template-columns: 1fr;
          }
        `}
      >
        <div>
          <EuiSelect
            compressed
            fullWidth
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.sessionSelect',
              {
                defaultMessage: 'Select a {provider} {grouping}',
                values: { provider: providerLabel, grouping },
              }
            )}
            value={selectedKey}
            onChange={(event) => {
              onSelectSession(event.target.value);
            }}
            options={inventory.sessions.map((session) => ({
              value: sessionSelectionKey(session),
              text: `${sessionName(session)} · ${new Date(session.start).toLocaleDateString()} · ${
                session.toolCount
              }${
                multipleInstallations
                  ? ` · ${
                      session.googleAdk?.requester.email ?? session.owner?.name ?? ''
                    } · ${shortSessionId(session.agentId)}`
                  : ''
              }`,
            }))}
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <AgentTimestamp value={selected.start} />
            {' → '}
            <AgentTimestamp value={selected.lastSeen} />
          </EuiText>
        </div>
        <CodexOutcomeStrip session={selected} />
      </div>
      {multipleModels && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.mixedModelCoverage',
              { defaultMessage: 'Multiple models recorded; historical comparisons are withheld.' }
            )}
          </EuiText>
        </>
      )}
      {inventory.partial && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.bounded',
              {
                defaultMessage:
                  '{loaded, number} of {total, number} {grouping} records loaded. The map and comparisons use this sample.',
                values: {
                  grouping: externalAgentGrouping(provider, true),
                  loaded: inventory.sessions.length,
                  total: inventory.total ?? inventory.sessions.length,
                },
              }
            )}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiTabs size="s">
        {tabs
          .filter((tab) => !mcpConnection || tab.id !== 'prompts')
          .map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={detailTab === tab.id}
              onClick={() => setDetailTab(tab.id)}
              prepend={<EuiIcon type={tab.icon} aria-hidden={true} />}
            >
              {tab.label}
            </EuiTab>
          ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {(detailTab === 'sessions' || detailTab === 'identity') && (
        <>
          <SecurityFindingsPanel compact scope={securityScope} result={securityResult} />
          <EuiSpacer size="m" />
        </>
      )}
      {detailTab === 'map' && (
        <>
          <CodexSessionGraph
            sessions={inventory.sessions}
            selected={selected}
            events={calls.isLoading || calls.unavailable ? [] : calls.events}
            onInspectEvent={(event) => setEvidence({ session: selected, event })}
            security={{ scope: securityScope, result: securityResult, spaceId }}
            onSelectSession={selectSession}
            onSelectTool={(name) => {
              setToolSelection({ sessionKey: selectedKey, name });
              setDetailTab('activity');
            }}
          />
          <EuiSpacer size="m" />
          {calls.isLoading ? (
            <>
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.checkingEvidence',
                  { defaultMessage: 'Loading tool evidence' }
                )}
              </EuiText>
              <EuiSkeletonText lines={3} />
            </>
          ) : mcpConnection ? null : (
            <BehaviorPanel
              analysis={analysis}
              onSelectTool={(name) => {
                setToolSelection({ sessionKey: selectedKey, name });
                setDetailTab('activity');
              }}
              baselineContent={
                baseline.length ? (
                  <EuiFlexGroup gutterSize="s" wrap>
                    {baseline.map((session) => (
                      <EuiFlexItem key={session.source.id} grow={false}>
                        <EuiButtonEmpty size="xs" onClick={() => setEvidence({ session })}>
                          {getCodexSessionTitle(session)}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                ) : undefined
              }
              onInspect={(finding) => {
                const event = calls.events.find((item) =>
                  finding.evidence.some(
                    (source) =>
                      source.source.index === item.source.index &&
                      source.source.id === item.source.id
                  )
                );
                setEvidence({ session: selected, event });
              }}
            />
          )}
        </>
      )}
      {detailTab === 'activity' &&
        (calls.isLoading ? (
          <EuiSkeletonText lines={6} />
        ) : calls.unavailable ? (
          <KbnWarningCallout
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.visual.callsUnavailable',
              { defaultMessage: 'Interaction evidence could not be loaded. Refresh to retry.' }
            )}
          />
        ) : (
          <CodexSessionTrail
            key={selectedKey}
            events={calls.events}
            complete={calls.complete}
            security={securityResult}
            toolFilter={activeTool}
            onToolFilterChange={(name) => setToolSelection({ sessionKey: selectedKey, name })}
            onInspect={(event) => setEvidence({ session: selected, event })}
          />
        ))}
      {detailTab === 'sessions' && (
        <IntelligencePanel>
          <EuiInMemoryTable
            items={installationSessions}
            columns={columns}
            itemId={sessionSelectionKey}
            pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
            sorting={{ sort: { field: 'lastSeen', direction: 'desc' } }}
            search={{ box: { incremental: true }, defaultQuery: '' }}
            tableCaption={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.tableCaption',
              {
                defaultMessage: 'Imported {provider} {grouping} inventory',
                values: { provider: providerLabel, grouping },
              }
            )}
          />
        </IntelligencePanel>
      )}
      {detailTab === 'prompts' && <CodexPromptDetails session={selected} />}
      {detailTab === 'identity' && <CodexSessionContext session={selected} />}
      {evidenceSession && (!evidence?.event || evidenceEvent) && (
        <CodexEvidence
          session={evidenceSession}
          event={evidenceEvent}
          security={securityResult}
          onClose={() => setEvidence(undefined)}
        />
      )}
    </div>
  );
};
