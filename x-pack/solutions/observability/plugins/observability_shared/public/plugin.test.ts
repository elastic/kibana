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
  ObservabilitySharedPlugin,
  OBSERVABILITY_AGENT_ID,
  OBSERVABILITY_SESSION_TAG,
} from './plugin';

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
        setAgentBuilderChatConfig: jest.fn(),
        clearAgentBuilderChatConfig: jest.fn(),
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

      expect(mockAgentBuilder.setAgentBuilderChatConfig).toHaveBeenCalledWith({
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

      expect(mockAgentBuilder.clearAgentBuilderChatConfig).toHaveBeenCalled();
    });

    it('does not call agent methods when appId is undefined', () => {
      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      currentAppId$.next(undefined);

      expect(mockAgentBuilder.setAgentBuilderChatConfig).not.toHaveBeenCalled();
      expect(mockAgentBuilder.clearAgentBuilderChatConfig).not.toHaveBeenCalled();
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

      expect(mockAgentBuilder.setAgentBuilderChatConfig).not.toHaveBeenCalled();
    });

    it('clears config when app has no category', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('unknownApp', createMockApp('unknownApp'));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      currentAppId$.next('unknownApp');

      expect(mockAgentBuilder.clearAgentBuilderChatConfig).toHaveBeenCalled();
    });

    it('handles rapid navigation between apps correctly', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('apm', createMockApp('apm', DEFAULT_APP_CATEGORIES.observability.id));
      apps.set('slo', createMockApp('slo', DEFAULT_APP_CATEGORIES.observability.id));
      apps.set('discover', createMockApp('discover', DEFAULT_APP_CATEGORIES.kibana.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      // Rapid navigation: apm -> discover -> slo
      currentAppId$.next('apm');
      currentAppId$.next('discover');
      currentAppId$.next('slo');

      expect(mockAgentBuilder.setAgentBuilderChatConfig).toHaveBeenLastCalledWith({
        agentId: OBSERVABILITY_AGENT_ID,
        sessionTag: OBSERVABILITY_SESSION_TAG,
        newConversation: false,
      });
    });

    it('skips redundant calls when navigating within same category', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('apm', createMockApp('apm', DEFAULT_APP_CATEGORIES.observability.id));
      apps.set('slo', createMockApp('slo', DEFAULT_APP_CATEGORIES.observability.id));
      apps.set('infra', createMockApp('infra', DEFAULT_APP_CATEGORIES.observability.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      // Navigate between Observability apps
      currentAppId$.next('apm');
      currentAppId$.next('slo');
      currentAppId$.next('infra');

      // Should only call setConfig once (for the first navigation to Observability)
      expect(mockAgentBuilder.setAgentBuilderChatConfig).toHaveBeenCalledTimes(1);
      expect(mockAgentBuilder.clearAgentBuilderChatConfig).not.toHaveBeenCalled();
    });

    it('skips redundant calls when navigating within non-Observability apps', () => {
      const apps = new Map<string, PublicAppInfo>();
      apps.set('discover', createMockApp('discover', DEFAULT_APP_CATEGORIES.kibana.id));
      apps.set('dashboard', createMockApp('dashboard', DEFAULT_APP_CATEGORIES.kibana.id));
      applications$.next(apps);

      plugin.start(coreStart, {
        embeddable: {} as any,
        share: sharePluginMock.createStartContract(),
        agentBuilder: mockAgentBuilder as AgentBuilderPluginStart,
      });

      // Navigate between non-Observability apps
      currentAppId$.next('discover');
      currentAppId$.next('dashboard');

      // Should only call clearConfig once (for the first navigation to non-Observability)
      expect(mockAgentBuilder.clearAgentBuilderChatConfig).toHaveBeenCalledTimes(1);
      expect(mockAgentBuilder.setAgentBuilderChatConfig).not.toHaveBeenCalled();
    });
  });
});
