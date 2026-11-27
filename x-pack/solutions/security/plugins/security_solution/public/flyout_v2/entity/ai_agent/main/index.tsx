/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useAiAgentContext } from '../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import { useAiAgentSessions } from '../../../../entity_analytics/components/ai_security/hooks/use_ai_agent_sessions';
import { parseAgentId } from '../../../../entity_analytics/components/ai_security/utils';
import { useFlyoutApi } from '../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { EntitySummaryGrid } from '../../shared/components/entity_summary_grid';
import { AiAgentHeader, isUnsanctionedAgent } from './header';
import { Footer } from './footer';
import { AttributionSection } from './components/attribution_section';
import { RiskSummarySection } from './components/risk_summary_section';
import { AlertsSection } from './components/alerts_section';
import { RelatedAgentsSection } from './components/related_agents_section';
import { InstallDetailsSection } from './components/install_details_section';
import { AgentActivity } from './components/agent_activity';
import { GraphTab } from './components/graph_tab';
import { toSummaryRecord } from './summary_record';
import { AI_AGENT_TEST_IDS } from './test_ids';
import { LOAD_ERROR, TAB_ACTIVITY, TAB_GRAPH, TAB_OVERVIEW } from './translations';

export interface AiAgentProps {
  /** Install ID: `ai_agent:{process.ai_agent.name}@{host.id}@{user.name}`. */
  entityId: string;
  /** Display name, used in the flyout history title. */
  entityName?: string;
  /** Scope id for downstream flyouts and cell actions. */
  scopeId: string;
}

type TabId = 'overview' | 'activity' | 'graph';

/**
 * AI agent flyout (proof of concept). The overview reads top down: the shared summary grid for the
 * agent's own facts, attribution (who signed in, the host and the OS user), the shared risk
 * summary, alerts worst first, related agents and install details. Agent activity and the
 * relationships graph have their own tabs. Agent criticality is read only.
 */
export const AiAgent: FC<AiAgentProps> = memo(function AiAgent({ entityId, entityName, scopeId }) {
  const [selectedTab, setSelectedTab] = useState<TabId>('overview');
  const [isRelatedAgentsOpen, setIsRelatedAgentsOpen] = useState(false);
  const relatedAgentsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useAiAgentContext(entityId);
  const { openAiAgentFlyoutAsChild } = useFlyoutApi();
  const spaceId = useSpaceId();
  const identity = data?.identity ?? parseAgentId(entityId);
  const agent = data?.agent;
  const agentName = entityName ?? agent?.entityName ?? entityId;
  const { data: sessions } = useAiAgentSessions(isLoading ? undefined : agent ?? identity);
  const runningSessions = useMemo(
    () => sessions?.sessions.filter((session) => session.status?.kind === 'running') ?? [],
    [sessions]
  );

  const onShowAgent = useCallback(
    () =>
      openAiAgentFlyoutAsChild({
        entityId,
        entityName,
        scopeId,
        origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
      }),
    [openAiAgentFlyoutAsChild, entityId, entityName, scopeId]
  );

  const onShowRelatedAgents = useCallback(() => {
    setIsRelatedAgentsOpen(true);
    requestAnimationFrame(() =>
      relatedAgentsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    );
  }, []);

  const onShowGraph = useCallback(() => setSelectedTab('graph'), []);

  if (!identity) {
    return (
      <EuiFlyoutBody>
        <KbnDangerCallout announceOnMount title={LOAD_ERROR} />
      </EuiFlyoutBody>
    );
  }

  const tabs: ReadonlyArray<{ id: TabId; name: string }> = [
    { id: 'overview', name: TAB_OVERVIEW },
    { id: 'activity', name: TAB_ACTIVITY },
    { id: 'graph', name: TAB_GRAPH },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <AiAgentHeader
          identity={identity}
          agent={agent}
          isLoading={isLoading}
          isUnsanctioned={isUnsanctionedAgent(agent, spaceId)}
          isRunning={runningSessions.length > 0}
          sessionCount={
            sessions && { count: sessions.sessions.length, truncated: sessions.truncated }
          }
        />
        <EuiSpacer size="s" />
        <EuiTabs size="s" bottomBorder={false} data-test-subj={AI_AGENT_TEST_IDS.tabs}>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={selectedTab === tab.id}
              onClick={() => setSelectedTab(tab.id)}
              data-test-subj={`${AI_AGENT_TEST_IDS.tabs}-${tab.id}`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isError && <KbnDangerCallout announceOnMount size="s" title={LOAD_ERROR} />}
        {selectedTab === 'overview' &&
          (isLoading || !data ? (
            <EuiSkeletonText lines={8} />
          ) : (
            <>
              <EntitySummaryGrid
                entityRecord={toSummaryRecord(entityId, agent)}
                criticalityLevel={agent?.criticality ?? 'unassigned'}
              />
              <AttributionSection
                context={data}
                identity={identity}
                scopeId={scopeId}
                onShowRelatedAgents={onShowRelatedAgents}
                onShowGraph={onShowGraph}
              />
              <EuiSpacer size="m" />
              <RiskSummarySection
                entityId={entityId}
                entityName={agentName}
                scopeId={scopeId}
                onShowAgent={onShowAgent}
              />
              <AlertsSection entityId={entityId} />
              <EuiHorizontalRule margin="m" />
              <div ref={relatedAgentsRef}>
                <RelatedAgentsSection
                  sameAccount={data.otherInstallsOnAccount}
                  sameHost={data.otherAgentsOnHost}
                  scopeId={scopeId}
                  isOpen={isRelatedAgentsOpen}
                  onToggle={setIsRelatedAgentsOpen}
                />
              </div>
              <InstallDetailsSection agent={agent} />
            </>
          ))}
        {selectedTab === 'activity' && <AgentActivity agent={agent ?? identity} />}
        {selectedTab === 'graph' && (
          <GraphTab
            entityId={entityId}
            entityName={agentName}
            scopeId={scopeId}
            onShowAgent={onShowAgent}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer identity={identity} agent={agent} runningSessions={runningSessions} />
      </EuiFlyoutFooter>
    </>
  );
});
