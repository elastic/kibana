/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router } from 'react-router-dom';

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from 'kibana/public';
import styled from 'styled-components';
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { ResolverStore } from '../../../../../../../plugins/security_solution/public/resolver/types';
import { PluginSetup as SecuritySolutionPluginSetup } from '../../../../../../../plugins/security_solution/public';

type ResolverPluginSetup = SecuritySolutionPluginSetup['resolver'];

/**
 * Render the Resolver Test app. Returns a cleanup function.
 */
export async function renderApp(
  coreStart: CoreStart,
  parameters: AppMountParameters,
  resolverPluginSetup: ResolverPluginSetup
) {
  /**
   * The application DOM node should take all available space.
   */
  parameters.element.style.display = 'flex';
  parameters.element.style.flexGrow = '1';

  const mocks = await resolverPluginSetup.mocks();
  const dataAccessLayer = mocks.dataAccessLayer.noAncestorsTwoChildren().dataAccessLayer;
  const store = resolverPluginSetup.storeFactory(dataAccessLayer);

  ReactDOM.render(
    <AppRoot
      Provider={resolverPluginSetup.Provider}
      ResolverWithoutProviders={resolverPluginSetup.ResolverWithoutProviders}
      coreStart={coreStart}
      history={parameters.history}
      store={store}
    />,
    parameters.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(parameters.element);
  };
}

const AppRoot = React.memo(
  ({
    coreStart,
    history,
    store,
    Provider,
    ResolverWithoutProviders,
  }: {
    coreStart: CoreStart;
    history: AppMountParameters['history'];
    store: ResolverStore;
    Provider: ResolverPluginSetup['Provider'];
    ResolverWithoutProviders: ResolverPluginSetup['ResolverWithoutProviders'];
  }) => {
    return (
      <I18nProvider>
        <Router history={history}>
          <KibanaContextProvider services={coreStart}>
            <Provider store={store}>
              <Wrapper>
                <ResolverWithoutProviders
                  databaseDocumentID=""
                  resolverComponentInstanceID="test"
                />
              </Wrapper>
            </Provider>
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  }
);

const Wrapper = styled.div`
  /**
   * Take all available space.
   */
  display: flex;
  flex-grow: 1;
`;
