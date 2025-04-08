/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AIForSOCSettingsManagement } from '@kbn/elastic-assistant';
import type { ManagementSettingsTabs } from '@kbn/elastic-assistant/impl/assistant/settings/types';
import { CONVERSATIONS_TAB } from '@kbn/elastic-assistant/impl/assistant/settings/const';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';

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
  return (
    <AIForSOCSettingsManagement
      dataViews={dataViews}
      onTabChange={onTabChange}
      currentTab={currentTab}
    />
  );
};
