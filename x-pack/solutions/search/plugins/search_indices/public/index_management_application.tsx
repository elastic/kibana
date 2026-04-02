/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ScopedHistory } from '@kbn/core/public';
import { render, unmountComponentAtNode } from '@kbn/core-mount-utils-browser';
import { I18nProvider } from '@kbn/i18n-react';
import type { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';
import { SearchIndexManagementApp } from './components/index_management/index_management_app';

export const renderIndexManagementApp = async (
  element: HTMLElement,
  deps: {
    core: CoreSetup;
    history: ScopedHistory;
    indexManagement: IndexManagementPluginSetup;
  }
) => {
  const { core, history, indexManagement } = deps;
  const [coreStart, depsStart] = await core.getStartServices();
  const services = {
    ...depsStart,
    history,
  };
  render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...coreStart, ...services }}>
        <I18nProvider>
          <SearchIndexManagementApp indexManagement={indexManagement} />
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
};
