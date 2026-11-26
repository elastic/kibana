/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useState } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { useAiAgentContext } from '../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import { parseAgentId } from '../../../../entity_analytics/components/ai_agents/utils';
import { useFlyoutApi } from '../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { AiAgentHeader } from './header';
import { ContextSection } from './components/context_section';
import { AlertsSection } from './components/alerts_section';
import { AgentActivity } from './components/agent_activity';
import { GraphTab } from './components/graph_tab';
import { AI_AGENT_TEST_IDS } from './test_ids';
import { LOAD_ERROR, NOT_IN_STORE, TAB_ACTIVITY, TAB_GRAPH, TAB_OVERVIEW } from './translations';

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
 * AI agent flyout (proof of concept). The overview leads with identity and context (who the agent
 * acts for, its host, the local user it runs as, other installs on the account), then its alerts.
 * Agent activity and the relationships graph have their own tabs.
 */
export const AiAgent: FC<AiAgentProps> = memo(function AiAgent({ entityId, entityName, scopeId }) {
  const [selectedTab, setSelectedTab] = useState<TabId>('overview');
  const { data, isLoading, isError } = useAiAgentContext(entityId);
  const { openAiAgentFlyoutAsChild } = useFlyoutApi();
  const identity = data?.identity ?? parseAgentId(entityId);
  const agent = data?.agent;

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
          signedInAs={data?.signedInAs}
          isLoading={isLoading}
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
        {!isLoading && !agent && !isError && (
          <>
            <KbnWarningCallout announceOnMount size="s" title={NOT_IN_STORE} />
            <EuiSpacer size="s" />
          </>
        )}
        {selectedTab === 'overview' &&
          (isLoading || !data ? (
            <EuiSkeletonText lines={8} />
          ) : (
            <>
              <ContextSection context={data} scopeId={scopeId} />
              <EuiHorizontalRule margin="m" />
              <AlertsSection entityId={entityId} />
            </>
          ))}
        {selectedTab === 'activity' && <AgentActivity agent={agent ?? identity} />}
        {selectedTab === 'graph' && (
          <GraphTab
            entityId={entityId}
            entityName={entityName ?? agent?.entityName ?? entityId}
            scopeId={scopeId}
            onShowAgent={onShowAgent}
          />
        )}
      </EuiFlyoutBody>
    </>
  );
});
