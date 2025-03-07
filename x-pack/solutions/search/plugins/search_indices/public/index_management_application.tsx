/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ScopedHistory } from '@kbn/core/public';
import { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { IndexManagementApp } from './components/index_management/index_management_app';

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
  ReactDOM.render(
    <KibanaContextProvider services={{ ...coreStart, ...services }}>
      <IndexManagementApp indexManagement={indexManagement} />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
