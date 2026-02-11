/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { elasticAssistantSharedStateMock } from '@kbn/elastic-assistant-shared-state-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import React from 'react';
import { ReactQueryClientProvider } from '../context/query_client_context/elastic_assistant_query_client_provider';
import { KibanaContextProvider } from '../context/typed_kibana_context/typed_kibana_context';
import type { AIAssistantManagementSelectionPluginPublicStart } from '@kbn/ai-assistant-management-plugin/public';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';

interface Props {
  children: React.ReactNode;
  services?: React.ComponentProps<typeof KibanaContextProvider>['services'];
}

export const ElasticAssistantTestProviders = ({ children, services }: Props) => {
  const mockApplication = applicationServiceMock.createInternalStartContract();
  const mockTriggersActionsUi = { actionTypeRegistry: actionTypeRegistryMock.create() };
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const elasticAssistantSharedState = elasticAssistantSharedStateMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const spaces = spacesPluginMock.createStartContract();

  return (
    <ReactQueryClientProvider>
      <KibanaContextProvider
        services={{
          appName: 'securitySolution',
          application: mockApplication,
          triggersActionsUi: mockTriggersActionsUi,
          docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co/', DOC_LINK_VERSION: 'current' },
          http: mockHttp,
          elasticAssistantSharedState,
          notifications,
          aiAssistantManagementSelection:
            {} as unknown as AIAssistantManagementSelectionPluginPublicStart,
          spaces,
          ...services,
        }}
      >
        {children}
      </KibanaContextProvider>
    </ReactQueryClientProvider>
  );
};
