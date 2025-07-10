/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { AssistantSettingsManagement } from '@kbn/elastic-assistant/impl/assistant/settings/assistant_settings_management';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { i18n } from '@kbn/i18n';
import { SECURITY_AI_SETTINGS } from '@kbn/elastic-assistant/impl/assistant/settings/translations';
import { CONVERSATIONS_TAB } from '@kbn/elastic-assistant/impl/assistant/settings/const';
import type { ManagementSettingsTabs } from '@kbn/elastic-assistant/impl/assistant/settings/types';

import { AssistantSpaceIdProvider } from '@kbn/elastic-assistant/impl/assistant/use_space_aware_context';
import { useKibana } from '../../common/lib/kibana';
import { useSpaceId } from '../../common/hooks/use_space_id';

export const ManagementSettings = React.memo(() => {
  const {
    application: {
      navigateToApp,
      capabilities: {
        securitySolutionAssistant: { 'ai-assistant': securityAIAssistantEnabled },
      },
    },
    data: { dataViews },
    chrome: { docTitle, setBreadcrumbs },
    serverless,
  } = useKibana().services;
  const spaceId = useSpaceId();

  docTitle.change(SECURITY_AI_SETTINGS);

  const [searchParams] = useSearchParams();
  const currentTab = useMemo(
    () => (searchParams.get('tab') as ManagementSettingsTabs) ?? CONVERSATIONS_TAB,
    [searchParams]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      navigateToApp('management', {
        path: `kibana/securityAiAssistantManagement?tab=${tab}`,
      });
    },
    [navigateToApp]
  );

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: i18n.translate(
            'xpack.securitySolution.assistant.settings.breadcrumb.serverless.security',
            {
              defaultMessage: 'AI Assistant for Security Settings',
            }
          ),
        },
      ]);
    } else {
      setBreadcrumbs([
        {
          text: i18n.translate(
            'xpack.securitySolution.assistant.settings.breadcrumb.stackManagement',
            {
              defaultMessage: 'Stack Management',
            }
          ),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management');
          },
        },
        {
          text: i18n.translate('xpack.securitySolution.assistant.settings.breadcrumb.index', {
            defaultMessage: 'AI Assistants',
          }),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management', { path: '/kibana/aiAssistantManagementSelection' });
          },
        },
        {
          text: i18n.translate('xpack.securitySolution.assistant.settings.breadcrumb.security', {
            defaultMessage: 'Security',
          }),
        },
      ]);
    }
  }, [navigateToApp, serverless, setBreadcrumbs]);

  if (!securityAIAssistantEnabled) {
    navigateToApp('home');
  }

  return spaceId ? (
    <AssistantSpaceIdProvider spaceId={spaceId}>
      <AssistantSettingsManagement
        dataViews={dataViews}
        onTabChange={handleTabChange}
        currentTab={currentTab}
      />
    </AssistantSpaceIdProvider>
  ) : null;
});

ManagementSettings.displayName = 'ManagementSettings';
