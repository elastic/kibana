/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiBetaBadge,
  EuiIcon,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../../app/types';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { EmptyPrompt } from '../../../common/components/empty_prompt';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { PageLoader } from '../../../common/components/page_loader';
import { NoPrivileges } from '../../../common/components/no_privileges';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useMissingRiskEnginePrivileges } from '../../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../../components/entity_store/hooks/use_entity_engine_privileges';
import { useEntityStoreDataView } from '../../components/home/use_entity_store_data_view';
import { useEntityStoreStatus } from '../../components/entity_store/hooks/use_entity_store';
import { EntityStoreDisabledEmptyPrompt } from '../entity_store_disabled_empty_prompt';
import type { IntelligenceTabId, IntelligenceEntity } from './common';
import { isIntelligenceTabId } from './common';
import { OverviewTab } from './overview_tab';
import { EntitiesTab } from './entities/ui/entities_tab';
import { ExplorerTab } from './explorer_tab';
import { AiHuntTab } from './ai_hunt_tab';
import { AiPoliciesTab } from './ai_policies/ai_policies_tab';
import { UseCasesTab } from './use_cases_tab';
import { EntityScopeSelector } from './entity_scope_selector';
import type { IntelligenceScope } from './entity_scope_selector';
import { AgentInventory } from './ai_agents/agent_inventory';
import { AgentExplorer } from './ai_agents/agent_explorer';
import { AgentSourceSelector } from './ai_agents/agent_source_selector';
import type { AgentSource } from './ai_agents/agent_source_selector';
import { CodexIntelligence } from './ai_agents/codex_intelligence';
import { tabTransition } from './animations';
import { UnifiedIdentityInventory } from './unified_identity_inventory';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.pageTitle', {
  defaultMessage: 'Entity Intelligence',
});

interface TabDefinition {
  id: IntelligenceTabId;
  label: string;
  icon: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'overview',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.overview', {
      defaultMessage: 'Overview',
    }),
    icon: 'visGauge',
  },
  {
    id: 'entities',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.entities', {
      defaultMessage: 'Entities',
    }),
    icon: 'tableDensityLow',
  },
  {
    id: 'explorer',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.explorer', {
      defaultMessage: 'Explorer',
    }),
    icon: 'graphApp',
  },
  {
    id: 'ai_hunt',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.aiHunt', {
      defaultMessage: 'AI Hunt',
    }),
    icon: 'sparkles',
  },
  {
    id: 'ai_policies',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.aiPolicies', {
      defaultMessage: 'AI policies',
    }),
    icon: 'shield',
  },
  {
    id: 'use_cases',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.tabs.useCases', {
      defaultMessage: 'Use Cases',
    }),
    icon: 'apps',
  },
];

export const EntityIntelligencePage: React.FC = () => (
  <>
    <SecuritySolutionPageWrapper data-test-subj="entityIntelligencePage">
      <EntityIntelligencePageContent />
    </SecuritySolutionPageWrapper>
    <SpyRoute pageName={SecurityPageName.entityAnalyticsIntelligence} />
  </>
);

const EntityStorePrerequisites: React.FC<React.PropsWithChildren> = ({ children }) => {
  const riskEngineReadPrivileges = useMissingRiskEnginePrivileges({ readonly: true });
  const entityEnginePrivilegesQuery = useEntityEnginePrivileges();
  const spaceId = useSpaceId();
  const { dataView, isLoading: dataViewLoading } = useEntityStoreDataView(spaceId);
  const { data: entityStoreStatusData } = useEntityStoreStatus();

  if (entityEnginePrivilegesQuery.isLoading || riskEngineReadPrivileges.isLoading) {
    return <PageLoader />;
  }

  const noPrivileges =
    !entityEnginePrivilegesQuery.isError && !entityEnginePrivilegesQuery.data?.has_read_permissions;
  if (noPrivileges) {
    return (
      <NoPrivileges
        pageName={PAGE_TITLE.toLowerCase()}
        docLinkSelector={(docLinks) =>
          docLinks.securitySolution.entityAnalytics.riskScorePrerequisites
        }
      />
    );
  }
  if (dataViewLoading) return <PageLoader />;
  if (!dataView?.matchedIndices?.length) return <EmptyPrompt />;
  if (
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped'
  ) {
    return <EntityStoreDisabledEmptyPrompt />;
  }
  return <>{children}</>;
};

const EntityIntelligencePageContent: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const history = useHistory();
  const { search } = useLocation();

  const selectedTab = useMemo<IntelligenceTabId>(() => {
    const tabParam = new URLSearchParams(search).get('tab');
    return isIntelligenceTabId(tabParam) ? tabParam : 'entities';
  }, [search]);

  const scopeParam = new URLSearchParams(search).get('scope');
  const scope: IntelligenceScope =
    scopeParam === 'agents' || scopeParam === 'entities' ? scopeParam : 'all';
  const agentId = new URLSearchParams(search).get('agentId') ?? undefined;
  const sourceParam = new URLSearchParams(search).get('agentSource');
  const agentSource: AgentSource =
    sourceParam === 'codex' ||
    sourceParam === 'cursor' ||
    sourceParam === 'claude_desktop' ||
    sourceParam === 'google_adk'
      ? sourceParam
      : 'agent_builder';
  const codexSessionId = new URLSearchParams(search).get('sessionId') ?? undefined;
  const explorerEntityId = new URLSearchParams(search).get('entityId') ?? undefined;
  const selectAgentSource = useCallback(
    (source: AgentSource) => {
      const params = new URLSearchParams(history.location.search);
      params.set('agentSource', source);
      params.delete('agentId');
      params.delete('sessionId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectCodexSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', 'explorer');
      params.set('scope', 'agents');
      params.set('agentSource', 'codex');
      params.set('sessionId', id);
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectCursorSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', 'explorer');
      params.set('scope', 'agents');
      params.set('agentSource', 'cursor');
      params.set('sessionId', id);
      params.delete('agentId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectClaudeDesktopSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', 'explorer');
      params.set('scope', 'agents');
      params.set('agentSource', 'claude_desktop');
      params.set('sessionId', id);
      params.delete('agentId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectGoogleAdkSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', 'explorer');
      params.set('scope', 'agents');
      params.set('agentSource', 'google_adk');
      params.set('sessionId', id);
      params.delete('agentId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectScope = useCallback(
    (nextScope: IntelligenceScope) => {
      const params = new URLSearchParams(history.location.search);
      params.set('scope', nextScope);
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const selectAgent = useCallback(
    (id: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('agentId', id);
      params.set('agentSource', 'agent_builder');
      params.delete('sessionId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );
  const drillAgentToExplorer = useCallback(
    (id: string, invocationId?: string) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', 'explorer');
      params.set('scope', 'agents');
      params.set('agentId', id);
      params.set('agentSource', 'agent_builder');
      if (invocationId) params.set('sessionId', invocationId);
      else params.delete('sessionId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  const selectTab = useCallback(
    (tabId: IntelligenceTabId) => {
      const params = new URLSearchParams(history.location.search);
      params.set('tab', tabId);
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  // Selection lifted to the shell so the Overview tab can hand an entity off
  // to the Explorer tab ("Investigate" drill-in).
  const [explorerEntity, setExplorerEntity] = useState<IntelligenceEntity | undefined>(undefined);

  const drillToExplorer = useCallback(
    (entity: IntelligenceEntity) => {
      setExplorerEntity(entity);
      const params = new URLSearchParams(history.location.search);
      params.set('scope', 'entities');
      params.set('tab', 'explorer');
      params.set('entityId', entity.id);
      params.delete('agentId');
      params.delete('agentSource');
      params.delete('sessionId');
      history.replace({ ...history.location, search: params.toString() });
    },
    [history]
  );

  const viewAllEntities = useCallback(() => {
    setExplorerEntity(undefined);
    selectScope('all');
    selectTab('entities');
  }, [selectTab, selectScope]);

  const heroStyle = css`
    position: relative;
    margin: -${euiTheme.size.l} -${euiTheme.size.l} 0;
    padding: ${euiTheme.size.l} ${euiTheme.size.l} 0;
    background: linear-gradient(
      135deg,
      ${transparentize(euiTheme.colors.primary, 0.12)} 0%,
      ${transparentize(euiTheme.colors.primary, 0.035)} 65%,
      ${euiTheme.colors.emptyShade} 100%
    );
    border-bottom: ${euiTheme.border.thin};
    overflow: clip;

    &::after {
      content: '';
      position: absolute;
      top: -60%;
      right: -10%;
      width: 40%;
      height: 200%;
      background: radial-gradient(
        ellipse at center,
        ${transparentize(euiTheme.colors.primary, 0.12)} 0%,
        transparent 70%
      );
      pointer-events: none;
    }
  `;

  const titleRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  `;

  const sparkleStyle = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      135deg,
      ${transparentize(euiTheme.colors.primary, 0.2)},
      ${transparentize(euiTheme.colors.primary, 0.04)}
    );
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.primary, 0.3)};
  `;

  const tabBarStyle = css`
    display: flex;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.l};
    overflow-x: auto;
    position: relative;
    z-index: 1;
  `;

  const tabButtonStyle = (isSelected: boolean) => css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    border-radius: ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0;
    border: none;
    flex-shrink: 0;
    cursor: pointer;
    font-size: ${euiTheme.size.m};
    font-weight: ${isSelected ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    color: ${isSelected ? euiTheme.colors.primaryText : euiTheme.colors.textSubdued};
    background: ${isSelected ? transparentize(euiTheme.colors.primary, 0.08) : 'transparent'};
    border-bottom: ${euiTheme.border.width.thick} solid
      ${isSelected ? euiTheme.colors.primary : 'transparent'};
    transition: background-color ${euiTheme.animation.fast} ease,
      color ${euiTheme.animation.fast} ease;

    &:hover {
      background: ${transparentize(euiTheme.colors.primary, 0.06)};
      color: ${euiTheme.colors.primaryText};
    }
  `;

  const contentStyle = css`
    padding-top: ${euiTheme.size.base};
  `;

  return (
    <>
      <div css={heroStyle}>
        <div css={titleRowStyle}>
          <span css={sparkleStyle}>
            <EuiIcon type="graphApp" size="xl" color="primary" aria-hidden={true} />
          </span>
          <div
            css={css`
              flex: 1;
              min-width: 240px;
            `}
          >
            <EuiTitle size="l">
              <h1>{PAGE_TITLE}</h1>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.pageSubtitle',
                  {
                    defaultMessage:
                      'Connect people, services and AI agents to the actions that matter.',
                  }
                )}
              </p>
            </EuiText>
          </div>
          <div
            aria-hidden="true"
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.m};
              padding: ${euiTheme.size.s} ${euiTheme.size.l};
              color: ${euiTheme.colors.primary};
              @media (max-width: 1000px) {
                display: none;
              }
            `}
          >
            <EuiIcon type="users" size="l" aria-hidden={true} />
            <span
              css={css`
                width: 28px;
                border-top: 1px solid ${transparentize(euiTheme.colors.primary, 0.3)};
              `}
            />
            <EuiIcon type="graphApp" size="l" aria-hidden={true} />
            <span
              css={css`
                width: 28px;
                border-top: 1px solid ${transparentize(euiTheme.colors.primary, 0.3)};
              `}
            />
            <EuiIcon type="shield" size="l" aria-hidden={true} />
          </div>
          <EuiBetaBadge
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.techPreviewBadge',
              { defaultMessage: 'Technical preview' }
            )}
            size="s"
            color="hollow"
          />
        </div>
        <div css={tabBarStyle} role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedTab === tab.id}
              css={tabButtonStyle(selectedTab === tab.id)}
              onClick={() => selectTab(tab.id)}
              data-test-subj={`entityIntelligenceTab-${tab.id}`}
            >
              <EuiIcon type={tab.icon} size="m" aria-hidden={true} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div css={contentStyle}>
        <div key={selectedTab} css={tabTransition}>
          {(selectedTab === 'entities' || selectedTab === 'explorer') && (
            <div
              css={css`
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: ${euiTheme.size.m};
                flex-wrap: wrap;
                margin-bottom: ${euiTheme.size.base};
              `}
            >
              <EntityScopeSelector scope={scope} onChange={selectScope} compact />
              {scope === 'agents' && (
                <AgentSourceSelector source={agentSource} onChange={selectAgentSource} />
              )}
            </div>
          )}
          {selectedTab === 'overview' ? (
            <OverviewTab
              onDrillToExplorer={drillToExplorer}
              onViewAllEntities={viewAllEntities}
              onInvestigateAgent={drillAgentToExplorer}
              onInvestigateCodex={selectCodexSession}
              onInvestigateCursor={selectCursorSession}
              onInvestigateClaudeDesktop={selectClaudeDesktopSession}
              onInvestigateGoogleAdk={selectGoogleAdkSession}
            />
          ) : selectedTab === 'ai_policies' ? (
            <AiPoliciesTab
              onInvestigateAgent={(agent) => {
                if (agent.provider === 'agent_builder') {
                  drillAgentToExplorer(agent.id, agent.sessionId);
                } else if (agent.sessionId) {
                  const selection = JSON.stringify([agent.id, agent.sessionId]);
                  if (agent.provider === 'google_adk') selectGoogleAdkSession(selection);
                  else if (agent.provider === 'claude_desktop')
                    selectClaudeDesktopSession(selection);
                  else if (agent.provider === 'cursor') selectCursorSession(selection);
                  else selectCodexSession(selection);
                }
              }}
            />
          ) : scope === 'all' && (selectedTab === 'entities' || selectedTab === 'explorer') ? (
            <UnifiedIdentityInventory
              onInvestigateEntity={drillToExplorer}
              onInvestigateAgent={drillAgentToExplorer}
              onInvestigateCodex={selectCodexSession}
              onInvestigateCursor={selectCursorSession}
              onInvestigateClaudeDesktop={selectClaudeDesktopSession}
              onInvestigateGoogleAdk={selectGoogleAdkSession}
            />
          ) : scope === 'agents' && (selectedTab === 'entities' || selectedTab === 'explorer') ? (
            <>
              {agentSource === 'codex' ||
              agentSource === 'cursor' ||
              agentSource === 'claude_desktop' ||
              agentSource === 'google_adk' ? (
                <CodexIntelligence
                  key={agentSource}
                  provider={agentSource}
                  view={selectedTab === 'entities' ? 'inventory' : 'explorer'}
                  sessionId={codexSessionId}
                  onInvestigateEntity={drillToExplorer}
                  onSelectSession={
                    agentSource === 'google_adk'
                      ? selectGoogleAdkSession
                      : agentSource === 'claude_desktop'
                      ? selectClaudeDesktopSession
                      : agentSource === 'cursor'
                      ? selectCursorSession
                      : selectCodexSession
                  }
                />
              ) : selectedTab === 'entities' ? (
                <AgentInventory onInvestigate={drillAgentToExplorer} />
              ) : (
                <AgentExplorer
                  agentId={agentId}
                  invocationId={codexSessionId}
                  onSelect={selectAgent}
                />
              )}
            </>
          ) : (
            <EntityStorePrerequisites>
              {selectedTab === 'entities' && <EntitiesTab onDrillToExplorer={drillToExplorer} />}
              {selectedTab === 'explorer' && (
                <ExplorerTab
                  initialEntity={explorerEntity}
                  entityId={explorerEntityId}
                  onSelectEntity={drillToExplorer}
                />
              )}
              {selectedTab === 'ai_hunt' && <AiHuntTab onDrillToExplorer={drillToExplorer} />}
              {selectedTab === 'use_cases' && <UseCasesTab />}
            </EntityStorePrerequisites>
          )}
        </div>
      </div>
    </>
  );
};
