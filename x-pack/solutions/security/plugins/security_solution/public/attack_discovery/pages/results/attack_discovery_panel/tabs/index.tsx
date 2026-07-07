/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { EuiTabs, EuiTab } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getTabs } from './get_tabs';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const TabsComponent: React.FC<Props> = ({
  attackDiscovery,
  replacements,
  showAnonymized = false,
}) => {
  const tabs = useMemo(
    () => getTabs({ attackDiscovery, replacements, showAnonymized }),
    [attackDiscovery, replacements, showAnonymized]
  );

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  const onSelectedTabChanged = useCallback((id: string) => setSelectedTabId(id), []);

  useEffect(() => {
    // Reset to the first tab if the attack discovery changes,
    // because (for example) the workflow status of the alerts may have changed:
    setSelectedTabId(tabs[0].id);
  }, [attackDiscovery, tabs]);

  return (
    <>
      <EuiTabs data-test-subj="tabs">
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            isSelected={tab.id === selectedTabId}
            onClick={() => onSelectedTabChanged(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabContent}
    </>
  );
};

TabsComponent.displayName = 'Tabs';

export const Tabs = React.memo(TabsComponent);
