/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import React from 'react';
import type { AssistantAvailability } from '@kbn/elastic-assistant';
import { AssistantProvider, AssistantSpaceIdProvider } from '@kbn/elastic-assistant';
import type { UserProfileService } from '@kbn/core/public';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { of } from 'rxjs';

interface Props {
  assistantAvailability?: AssistantAvailability;
  children: React.ReactNode;
}

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();
const ELASTIC_DOCS = 'https://www.elastic.co/docs/';

/** A utility for wrapping children in the providers required to run tests */
export const MockAssistantProviderComponent: React.FC<Props> = ({
  assistantAvailability,
  children,
}) => {
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const mockNavigateToApp = jest.fn();
  const defaultAssistantAvailability: AssistantAvailability = {
    hasSearchAILakeConfigurations: false,
    hasAssistantPrivilege: false,
    hasConnectorsAllPrivilege: true,
    hasConnectorsReadPrivilege: true,
    hasUpdateAIAssistantAnonymization: true,
    hasManageGlobalKnowledgeBase: true,
    isAssistantEnabled: true,
  };
  const chrome = chromeServiceMock.createStartContract();
  chrome.getChromeStyle$.mockReturnValue(of('classic'));

  const mockUserProfileService = {
    getCurrent: jest.fn(() => Promise.resolve({ avatar: 'avatar' })),
  } as unknown as UserProfileService;

  return (
    <AssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      assistantAvailability={assistantAvailability ?? defaultAssistantAvailability}
      augmentMessageCodeBlocks={jest.fn(() => [])}
      basePath={'https://localhost:5601/kbn'}
      docLinks={{
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        links: {
          securitySolution: {
            elasticAiFeatures: `${ELASTIC_DOCS}solutions/security/ai`,
            thirdPartyLlmProviders: `${ELASTIC_DOCS}solutions/security/ai/set-up-connectors-for-large-language-models-llm`,
            llmPerformanceMatrix: `${ELASTIC_DOCS}solutions/security/ai/large-language-model-performance-matrix`,
          },
          alerting: {
            elasticManagedLlm: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/elastic-managed-llm`,
            elasticManagedLlmUsageCost: `https://www.elastic.co/pricing`,
          },
        } as DocLinksStart['links'],
        DOC_LINK_VERSION: 'current',
      }}
      getComments={jest.fn(() => [])}
      getUrlForApp={jest.fn()}
      http={mockHttp}
      navigateToApp={mockNavigateToApp}
      currentAppId={'test'}
      productDocBase={{
        installation: { getStatus: jest.fn(), install: jest.fn(), uninstall: jest.fn() },
      }}
      userProfileService={mockUserProfileService}
      chrome={chrome}
    >
      <AssistantSpaceIdProvider spaceId="default">{children}</AssistantSpaceIdProvider>
    </AssistantProvider>
  );
};

MockAssistantProviderComponent.displayName = 'MockAssistantProviderComponent';

export const MockAssistantProvider = React.memo(MockAssistantProviderComponent);
