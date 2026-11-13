/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { AppHeaderTab } from '@kbn/app-header';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { ConfigurationTabs } from '../constants';
import * as i18n from '../translations';

const CONFIGURATION_TABS = [
  {
    tabId: ConfigurationTabs.integrations,
    deepLinkId: SecurityPageName.configurationsIntegrations,
    name: i18n.INTEGRATIONS,
  },
  {
    tabId: ConfigurationTabs.basicRules,
    deepLinkId: SecurityPageName.configurationsBasicRules,
    name: i18n.BASIC_RULES,
  },
  {
    tabId: ConfigurationTabs.aiSettings,
    deepLinkId: SecurityPageName.configurationsAiSettings,
    name: i18n.AI_SETTINGS,
  },
];

export const ConfigurationsHeader = React.memo(() => {
  const { navigateTo, getAppUrl } = useNavigation();
  const {
    services: { docLinks },
  } = useKibana();
  const params = useParams<{ tab?: ConfigurationTabs }>();
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const filteredTabs = useMemo(
    () =>
      CONFIGURATION_TABS.filter(
        (tab) => !isAgentChatExperienceEnabled || tab.tabId !== ConfigurationTabs.aiSettings
      ),
    [isAgentChatExperienceEnabled]
  );

  const onSelectedTabChanged = useCallback(
    (deepLinkId: SecurityPageName) => {
      navigateTo({ deepLinkId });
    },
    [navigateTo]
  );

  const tabs = useMemo<AppHeaderTab[]>(
    () =>
      filteredTabs.map((tab) => ({
        id: tab.tabId,
        label: tab.name,
        isSelected: tab.tabId === params.tab,
        href: getAppUrl({ deepLinkId: tab.deepLinkId }),
        onClick: (event?: React.MouseEvent) => {
          // Unmodified clicks stay in the app. Modified clicks follow `href`.
          if (
            event != null &&
            (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
          ) {
            return;
          }
          event?.preventDefault();
          onSelectedTabChanged(tab.deepLinkId);
        },
        'data-test-subj': `configurationsTab-${tab.tabId}`,
      })),
    [filteredTabs, getAppUrl, onSelectedTabChanged, params.tab]
  );

  return (
    <SecurityAppHeader
      title={i18n.CONFIGURATIONS}
      tabs={tabs}
      docLink={docLinks.links.siem.guide}
      spacing="largeBleed"
    />
  );
});

ConfigurationsHeader.displayName = 'ConfigurationsHeader';
