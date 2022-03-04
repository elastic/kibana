/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Router } from 'react-router-dom';

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { useMemo } from 'react';
import styled from 'styled-components';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  DataAccessLayer,
  ResolverPluginSetup,
} from '../../../../../../../plugins/security_solution/public/resolver/types';

/**
 * Render the Resolver Test app. Returns a cleanup function.
 */
export function renderApp(
  coreStart: CoreStart,
  parameters: AppMountParameters,
  resolverPluginSetup: ResolverPluginSetup
) {
  /**
   * The application DOM node should take all available space.
   */
  parameters.element.style.display = 'flex';
  parameters.element.style.flexGrow = '1';

  ReactDOM.render(
    <AppRoot
      coreStart={coreStart}
      parameters={parameters}
      resolverPluginSetup={resolverPluginSetup}
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
    parameters,
    resolverPluginSetup,
  }: {
    coreStart: CoreStart;
    parameters: AppMountParameters;
    resolverPluginSetup: ResolverPluginSetup;
  }) => {
    const {
      Provider,
      storeFactory,
      ResolverWithoutProviders,
      mocks: {
        dataAccessLayer: { noAncestorsTwoChildrenWithRelatedEventsOnOrigin },
      },
    } = resolverPluginSetup;
    const dataAccessLayer: DataAccessLayer = useMemo(
      () => noAncestorsTwoChildrenWithRelatedEventsOnOrigin().dataAccessLayer,
      [noAncestorsTwoChildrenWithRelatedEventsOnOrigin]
    );

    const store = useMemo(() => {
      return storeFactory(dataAccessLayer);
    }, [storeFactory, dataAccessLayer]);

    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={coreStart}>
            <Provider store={store}>
              <Wrapper>
                <ResolverWithoutProviders
                  databaseDocumentID=""
                  resolverComponentInstanceID="test"
                  indices={[]}
                  shouldUpdate={false}
                  filters={{}}
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
