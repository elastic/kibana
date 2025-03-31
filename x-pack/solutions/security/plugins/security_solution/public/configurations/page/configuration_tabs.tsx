/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { CONFIGURATIONS_PATH } from '../../../common/constants';
import { useNavigation } from '../../common/lib/kibana';

import * as i18n from '../translations';
export enum ConfigurationTabs {
  integrations = 'integrations',
  basicRules = 'basic_rules',
  knowledgeSources = 'knowledge_sources',
}

export const ConfigurationsTabs = React.memo(() => {
  const { navigateTo } = useNavigation();
  const params: { tab: ConfigurationTabs } = useParams();

  const tabs = useMemo(
    () => ({
      [ConfigurationTabs.integrations]: {
        id: ConfigurationTabs.integrations,
        name: i18n.INTEGRATIONS,
        disabled: false,
        href: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`,
      },

      [ConfigurationTabs.knowledgeSources]: {
        id: ConfigurationTabs.knowledgeSources,
        name: i18n.KNOWLEDGE_SOURCES,
        disabled: false,
        href: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.knowledgeSources}`,
      },
      [ConfigurationTabs.basicRules]: {
        id: ConfigurationTabs.basicRules,
        name: i18n.BASIC_RULES,
        disabled: false,
        href: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.basicRules}`,
      },
    }),
    []
  );

  const tabsArray = useMemo(() => Object.values(tabs), [tabs]);

  const onSelectedTabChanged = useCallback(
    (id: ConfigurationTabs) => {
      navigateTo({
        deepLinkId: SecurityPageName.configurations,
        path: id,
      });
    },
    [navigateTo]
  );

  return (
    <EuiTabs size="m" bottomBorder>
      {tabsArray.map((tab, i) => (
        <EuiTab
          key={`${tab}-${i}`}
          onClick={() => onSelectedTabChanged(tab.id)}
          isSelected={tab.id === params.tab}
          disabled={tab.disabled}
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
});

ConfigurationsTabs.displayName = 'RulesTableToolbar';
