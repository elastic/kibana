/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { AssistantProvider } from './assistant_provider';
import React from 'react';
import { ElasticAssistantTestProviders } from '../../utils/elastic_assistant_test_providers.mock';
import { elasticAssistantSharedStateMock } from '@kbn/elastic-assistant-shared-state-plugin/public/mocks';
import { firstValueFrom, Subject } from 'rxjs';
import type { AIExperienceSelection } from '@kbn/ai-assistant-management-plugin/public';
import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';

describe('AssistantProvider', () => {
  it('renders assistant provider and pushes the assistant context value to the shared state', async () => {
    const elasticAssistantSharedState = elasticAssistantSharedStateMock.createStartContract();
    const mockApplication = applicationServiceMock.createInternalStartContract();
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const mockTriggersActionsUi = { actionTypeRegistry };
    const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
    const notifications = notificationServiceMock.createStartContract();
    const settings = { client: uiSettingsServiceMock.createStartContract() };

    const openChatTrigger$ = new Subject<AIExperienceSelection>();

    render(
      <AssistantProvider openChatTrigger$={openChatTrigger$} completeOpenChat={() => {}}>
        <div data-test-subj="assistant-provider-test">{'Assistant Provider Test'}</div>
      </AssistantProvider>,
      {
        wrapper: ({ children }) => (
          <ElasticAssistantTestProviders
            services={{
              application: mockApplication,
              triggersActionsUi: mockTriggersActionsUi,
              http: mockHttp,
              notifications,
              elasticAssistantSharedState,
              settings,
              featureFlags: {
                getBooleanValue: jest.fn().mockReturnValue(false),
              },
            }}
          >
            {children}
          </ElasticAssistantTestProviders>
        ),
      }
    );

    const assistantContextValue = await firstValueFrom(
      elasticAssistantSharedState.assistantContextValue.getAssistantContextValue$()
    );
    expect(assistantContextValue).toBeDefined();
    expect(assistantContextValue).toEqual(
      expect.objectContaining({
        actionTypeRegistry,
        assistantAvailability: expect.objectContaining({
          hasAssistantPrivilege: expect.any(Boolean),
          hasConnectorsAllPrivilege: expect.any(Boolean),
          hasConnectorsReadPrivilege: expect.any(Boolean),
          hasManageGlobalKnowledgeBase: expect.any(Boolean),
          hasSearchAILakeConfigurations: expect.any(Boolean),
          hasUpdateAIAssistantAnonymization: expect.any(Boolean),
          isAssistantEnabled: expect.any(Boolean),
          isAssistantVisible: expect.any(Boolean),
        }),
        assistantFeatures: expect.objectContaining({
          assistantModelEvaluation: expect.any(Boolean),
          defendInsightsPolicyResponseFailure: expect.any(Boolean),
        }),
        assistantStreamingEnabled: expect.any(Boolean),
        assistantTelemetry: expect.any(Object),
        augmentMessageCodeBlocks: expect.objectContaining({
          mount: expect.any(Function),
        }),
        basePath: expect.any(String),
        basePromptContexts: expect.any(Array),
        codeBlockRef: expect.objectContaining({ current: expect.any(Function) }),
        contentReferencesVisible: expect.any(Boolean),
        currentAppId: expect.any(String),
        docLinks: expect.objectContaining({
          DOC_LINK_VERSION: expect.any(String),
          ELASTIC_WEBSITE_URL: expect.any(String),
        }),
        getComments: expect.any(Function),
        http: expect.anything(),
        inferenceEnabled: expect.any(Boolean),
        knowledgeBase: expect.objectContaining({
          latestAlerts: expect.any(Number),
        }),
        nameSpace: expect.any(String),
        navigateToApp: expect.any(Function),
        promptContexts: expect.any(Object),
        registerPromptContext: expect.any(Function),
        setAssistantStreamingEnabled: expect.any(Function),
        setContentReferencesVisible: expect.any(Function),
        setKnowledgeBase: expect.any(Function),
        setSelectedSettingsTab: expect.any(Function),
        setShowAnonymizedValues: expect.any(Function),
        setShowAssistantOverlay: expect.any(Function),
        setTraceOptions: expect.any(Function),
        showAnonymizedValues: expect.any(Boolean),
        title: expect.any(String),
        toasts: expect.any(Object),
        traceOptions: expect.any(Object),
        unRegisterPromptContext: expect.any(Function),
      })
    );
  });
});
