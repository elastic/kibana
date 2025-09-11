/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  SearchAILakeConfigurationsSettingsManagement,
  CONVERSATIONS_TAB,
  type ManagementSettingsTabs,
  AssistantSpaceIdProvider,
} from '@kbn/elastic-assistant';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { DefaultAiConnectorSettingsContextProvider } from '@kbn/ai-assistant-default-llm-setting';
import { SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { useSpaceId } from '../../common/hooks/use_space_id';

export const AISettings: React.FC = () => {
  const { navigateTo } = useNavigation();
  const {
    application,
    data: { dataViews },
    settings,
    docLinks,
    notifications: { toasts },
    featureFlags,
  } = useKibana().services;

  const {
    navigateToApp,
    capabilities: {
      securitySolutionAssistant: { 'ai-assistant': securityAIAssistantEnabled },
    },
  } = application;
  const spaceId = useSpaceId();
  const onTabChange = useCallback(
    (tab: string) => {
      navigateTo({
        deepLinkId: SecurityPageName.configurationsAiSettings,
        path: `?tab=${tab}`,
      });
    },
    [navigateTo]
  );

  const [searchParams] = useSearchParams();
  const currentTab = useMemo(
    () => (searchParams.get('tab') as ManagementSettingsTabs) ?? CONVERSATIONS_TAB,
    [searchParams]
  );
  if (!securityAIAssistantEnabled) {
    navigateToApp('home');
  }
  return spaceId ? (
    <AssistantSpaceIdProvider spaceId={spaceId}>
      <DefaultAiConnectorSettingsContextProvider
        application={application}
        docLinks={docLinks}
        toast={toasts}
        featureFlags={featureFlags}
      >
        <SearchAILakeConfigurationsSettingsManagement
          dataViews={dataViews}
          onTabChange={onTabChange}
          currentTab={currentTab}
          settings={settings}
        />
      </DefaultAiConnectorSettingsContextProvider>
    </AssistantSpaceIdProvider>
  ) : null;
};
