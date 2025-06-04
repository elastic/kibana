/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { useNavigation } from '../../common/lib/kibana';
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
export const ConfigurationsTabs = React.memo(() => {
  const { navigateTo } = useNavigation();
  const params: { tab: ConfigurationTabs } = useParams();

  const onSelectedTabChanged = useCallback(
    (deepLinkId: SecurityPageName) => {
      navigateTo({ deepLinkId });
    },
    [navigateTo]
  );

  return (
    <EuiTabs size="m" bottomBorder>
      {CONFIGURATION_TABS.map((tab) => (
        <EuiTab
          key={tab.deepLinkId}
          onClick={() => onSelectedTabChanged(tab.deepLinkId)}
          isSelected={tab.tabId === params.tab}
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
});

ConfigurationsTabs.displayName = 'RulesTableToolbar';
