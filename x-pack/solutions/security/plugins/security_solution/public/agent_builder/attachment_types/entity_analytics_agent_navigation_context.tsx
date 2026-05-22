/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import { APP_UI_ID } from '../../../common';
import type {
  SecurityAgentBuilderChrome,
  EntityFlyoutRightPanel,
} from './entity_explore_navigation';
import {
  navigateToEntityAnalyticsWithFlyoutInApp,
  navigateToEntityAnalyticsHomePageInApp,
} from './entity_explore_navigation';

interface EntityAnalyticsAgentNavigationContextValue {
  application?: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  openSidebarConversation?: () => void;
  searchSession?: ISessionService;
}

const EntityAnalyticsAgentNavigationContext =
  createContext<EntityAnalyticsAgentNavigationContextValue>({});

export const EntityAnalyticsAgentNavigationProvider: React.FC<
  React.PropsWithChildren<EntityAnalyticsAgentNavigationContextValue>
> = ({ application, agentBuilder, chrome, openSidebarConversation, searchSession, children }) => {
  const value = useMemo<EntityAnalyticsAgentNavigationContextValue>(
    () => ({ application, agentBuilder, chrome, openSidebarConversation, searchSession }),
    [application, agentBuilder, chrome, openSidebarConversation, searchSession]
  );
  return (
    <EntityAnalyticsAgentNavigationContext.Provider value={value}>
      {children}
    </EntityAnalyticsAgentNavigationContext.Provider>
  );
};

interface EntityAnalyticsAgentNavigation {
  canNavigate: boolean;
  navigateWithFlyout: (flyout: { preview: unknown[]; right: EntityFlyoutRightPanel }) => void;
  navigateToHome: (opts?: { watchlistId?: string; watchlistName?: string }) => void;
}

export const useEntityAnalyticsAgentNavigation = (): EntityAnalyticsAgentNavigation => {
  const { application, agentBuilder, chrome, openSidebarConversation, searchSession } = useContext(
    EntityAnalyticsAgentNavigationContext
  );

  const canNavigate = application != null;

  const navigateWithFlyout = useCallback(
    (flyout: { preview: unknown[]; right: EntityFlyoutRightPanel }) => {
      if (!application) return;
      navigateToEntityAnalyticsWithFlyoutInApp({
        application,
        appId: APP_UI_ID,
        flyout,
        agentBuilder,
        chrome,
        openSidebarConversation,
        searchSession,
      });
    },
    [application, agentBuilder, chrome, openSidebarConversation, searchSession]
  );

  const navigateToHome = useCallback(
    (opts?: { watchlistId?: string; watchlistName?: string }) => {
      if (!application) return;
      navigateToEntityAnalyticsHomePageInApp({
        application,
        appId: APP_UI_ID,
        agentBuilder,
        chrome,
        openSidebarConversation,
        searchSession,
        ...opts,
      });
    },
    [application, agentBuilder, chrome, openSidebarConversation, searchSession]
  );

  return { canNavigate, navigateWithFlyout, navigateToHome };
};
