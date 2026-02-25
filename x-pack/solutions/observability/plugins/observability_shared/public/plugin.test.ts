/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { PublicAppInfo } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  OBSERVABILITY_AGENT_ID,
  OBSERVABILITY_SESSION_TAG,
} from '@kbn/observability-agent-builder-plugin/common';
import { ObservabilitySharedPlugin } from './plugin';

describe('ObservabilitySharedPlugin', () => {
  const createMockApp = (id: string, categoryId?: string): PublicAppInfo =>
    ({
      id,
      title: id,
      category: categoryId ? { id: categoryId, label: categoryId } : undefined,
    } as PublicAppInfo);

  describe('setupObservabilityAgentDefault', () => {
    let plugin: ObservabilitySharedPlugin;
    let coreStart: ReturnType<typeof coreMock.createStart>;
    let currentAppId$: BehaviorSubject<string | undefined>;
    let applications$: BehaviorSubject<Map<string, PublicAppInfo>>;
    let mockAgentBuilder: jest.Mocked<Partial<AgentBuilderPluginStart>>;

    beforeEach(() => {
      plugin = new ObservabilitySharedPlugin();
      coreStart = coreMock.createStart();

      currentAppId$ = new BehaviorSubject<string | undefined>(undefined);
      applications$ = new BehaviorSubject<Map<string, PublicAppInfo>>(new Map());

      coreStart.application.currentAppId$ = currentAppId$;
      coreStart.application.applications$ = applications$ as any;

      mockAgentBuilder = {
        setConversationFlyoutActiveConfig: jest.fn(),
        clearConversationFlyoutActiveConfig: jest.fn(),
      };
    });

    afterEach(() => {
      plugin.stop();
      jest.clearAllMocks();
    });

    it('sets Observability agent config when navigating to an Observability app', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('apm', createMockApp('apm', DEFAULT_APP_CATEGORIES.observability.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      currentAppId$.next('apm');

      expect(mockAgentBuilder.setConversationFlyoutActiveConfig).toHaveBeenCalledWith({
        agentId: OBSERVABILITY_AGENT_ID,
        sessionTag: OBSERVABILITY_SESSION_TAG,
        newConversation: false,
      });
    });

    it('clears agent config when navigating to a non-Observability app', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('discover', createMockApp('discover', DEFAULT_APP_CATEGORIES.kibana.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      currentAppId$.next('discover');

      expect(mockAgentBuilder.clearConversationFlyoutActiveConfig).toHaveBeenCalled();
    });

    it('does not call agent methods when appId is undefined', () => {
      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      currentAppId$.next(undefined);

      expect(mockAgentBuilder.setConversationFlyoutActiveConfig).not.toHaveBeenCalled();
      expect(mockAgentBuilder.clearConversationFlyoutActiveConfig).not.toHaveBeenCalled();
    });

    it('does not throw when agentBuilder is undefined', () => {
      expect(() => {
        plugin.start(coreStart, {
          embeddable: {} as any,
          share: sharePluginMock.createStartContract(),
          agentBuilder: undefined,
        });
      }).not.toThrow();
    });

    it('does not throw when setConversationFlyoutActiveConfig is undefined', () => {
      expect(() => {
        plugin.start(coreStart, {
          embeddable: {} as any,
          share: sharePluginMock.createStartContract(),
          agentBuilder: {} as AgentBuilderPluginStart,
        });
      }).not.toThrow();
    });

    it('unsubscribes from app changes on stop', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('apm', createMockApp('apm', DEFAULT_APP_CATEGORIES.observability.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      plugin.stop();
      jest.clearAllMocks();

      currentAppId$.next('apm');

      expect(mockAgentBuilder.setConversationFlyoutActiveConfig).not.toHaveBeenCalled();
    });
  });
});
