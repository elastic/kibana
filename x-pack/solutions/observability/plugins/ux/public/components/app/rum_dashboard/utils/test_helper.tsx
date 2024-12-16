/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as testLibRender } from '@testing-library/react';
import { of } from 'rxjs';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { MemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UrlParamsProvider } from '../../../../context/url_params_context/url_params_context';

const core = coreMock.createStart();
jest.spyOn(core.uiSettings, 'get').mockImplementation((_key: string) => true);
jest.spyOn(core.uiSettings, 'get$').mockImplementation((_key: string) => of(true));

export const render = (component: React.ReactNode, options: { customHistory: MemoryHistory }) => {
  const history = options?.customHistory ?? createMemoryHistory();

  history.location.key = 'TestKeyForTesting';

  return testLibRender(
    <KibanaRenderContextProvider {...core}>
      <Router history={history}>
        <KibanaContextProvider services={core}>
          <UrlParamsProvider>{component}</UrlParamsProvider>
        </KibanaContextProvider>
      </Router>
    </KibanaRenderContextProvider>
  );
};
