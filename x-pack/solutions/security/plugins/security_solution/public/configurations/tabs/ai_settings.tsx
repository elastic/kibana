/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  SearchAILakeConfigurationsSettingsManagement,
  CONVERSATIONS_TAB,
  type ManagementSettingsTabs,
  AssistantSpaceIdProvider,
} from '@kbn/elastic-assistant';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';

export const AISettings: React.FC = () => {
  const { navigateTo } = useNavigation();
  const {
    application: {
      navigateToApp,
      capabilities: {
        securitySolutionAssistant: { 'ai-assistant': securityAIAssistantEnabled },
      },
    },
    data: { dataViews },
  } = useKibana().services;
  const spaceId = useSpaceId();
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
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

  useEffect(() => {
    if (!securityAIAssistantEnabled) {
      navigateToApp('home');
    } else if (isAgentChatExperienceEnabled) {
      navigateTo({
        deepLinkId: SecurityPageName.configurationsIntegrations,
      });
    }
  }, [securityAIAssistantEnabled, isAgentChatExperienceEnabled, navigateToApp, navigateTo]);

  if (!securityAIAssistantEnabled || isAgentChatExperienceEnabled) {
    return null;
  }

  return spaceId ? (
    <AssistantSpaceIdProvider spaceId={spaceId}>
      <SearchAILakeConfigurationsSettingsManagement
        dataViews={dataViews}
        onTabChange={onTabChange}
        currentTab={currentTab}
      />
    </AssistantSpaceIdProvider>
  ) : null;
};
