/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPageTemplate, EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DefinitionsTab } from './definitions_tab';
import { EntitiesTab } from './entities_tab';

type TabId = 'definitions' | 'entities';

interface Props {
  http: HttpStart;
  dataViews: DataPublicPluginStart['dataViews'];
  SearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
}

export const App = ({ http, dataViews, SearchBar }: Props) => {
  const [activeTab, setActiveTab] = useState<TabId>('definitions');

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.entitiesRuntimeCaue.app.title', {
          defaultMessage: 'Runtime Entity Explorer',
        })}
      />
      <EuiPageTemplate.Section paddingSize="none">
        <EuiTabs>
          <EuiTab
            isSelected={activeTab === 'definitions'}
            onClick={() => setActiveTab('definitions')}
            data-test-subj="entitiesRuntimeTabDefinitions"
          >
            {i18n.translate('xpack.entitiesRuntimeCaue.app.tabDefinitions', {
              defaultMessage: 'Definitions',
            })}
          </EuiTab>
          <EuiTab
            isSelected={activeTab === 'entities'}
            onClick={() => setActiveTab('entities')}
            data-test-subj="entitiesRuntimeTabEntities"
          >
            {i18n.translate('xpack.entitiesRuntimeCaue.app.tabEntities', {
              defaultMessage: 'Entities',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiPageTemplate.Section>
      {activeTab === 'definitions' ? (
        <DefinitionsTab http={http} />
      ) : (
        <EntitiesTab http={http} dataViews={dataViews} SearchBar={SearchBar} />
      )}
    </EuiPageTemplate>
  );
};
