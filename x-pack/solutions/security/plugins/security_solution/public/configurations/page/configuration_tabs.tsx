/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { CONFIGURATIONS_PATH } from '../../../common/constants';

export enum ConfigurationTabs {
  integrations = 'integrations',
  basicRules = 'basic_rules',
  knowledgeSources = 'knowledge_sources',
}
const getConfigurationTabUrls = (tabName: ConfigurationTabs) => `${CONFIGURATIONS_PATH}/${tabName}`;

export const ConfigurationsTabs = React.memo(() => {
  const history = useHistory();
  const params: { tab: ConfigurationTabs } = useParams();

  const tabs = useMemo(
    () => ({
      [ConfigurationTabs.integrations]: {
        id: ConfigurationTabs.integrations,
        name: 'Integrations',
        disabled: false,
        href: getConfigurationTabUrls(ConfigurationTabs.integrations),
      },

      [ConfigurationTabs.knowledgeSources]: {
        id: ConfigurationTabs.knowledgeSources,
        name: 'Knowledge Sources',
        disabled: false,
        href: getConfigurationTabUrls(ConfigurationTabs.knowledgeSources),
      },
      [ConfigurationTabs.basicRules]: {
        id: ConfigurationTabs.basicRules,
        name: 'Rules',
        disabled: false,
        href: getConfigurationTabUrls(ConfigurationTabs.basicRules),
      },
    }),
    []
  );

  const tabsArray = useMemo(() => Object.values(tabs), [tabs]);

  const initialPage = params.tab || ConfigurationTabs.integrations;
  const [selectedTabId, setSelectedTabId] = useState(initialPage);

  const onSelectedTabChanged = useCallback(
    (id: ConfigurationTabs) => {
      setSelectedTabId(id);
      const { href } = tabs[id];
      history.push(href);
    },
    [history, tabs]
  );

  return (
    <EuiFlexGroup justifyContent={'spaceBetween'}>
      <EuiFlexItem grow={false}>
        <EuiTabs size="l" expand>
          {tabsArray.map((tab, i) => (
            <EuiTab
              key={`${tab}-${i}`}
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
              disabled={tab.disabled}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false} />
    </EuiFlexGroup>
  );
});

ConfigurationsTabs.displayName = 'RulesTableToolbar';
