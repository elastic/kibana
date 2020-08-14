/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router } from 'react-router-dom';

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, AppMountContext } from 'kibana/public';
import { useMemo } from 'react';
import styled from 'styled-components';
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { DataAccessLayer } from '../../../../../../../plugins/security_solution/public/resolver/types';
import {
  ResolverReduxProvider,
  resolverStoreFactory,
  ResolverWithoutProviders,
  resolverMockDataAccessLayerWithNoAncestorsTwoChildren,
} from '../../../../../../../plugins/security_solution/public';

/**
 * Render the Resolver Test app. Returns a cleanup function.
 */
export function renderApp(context: AppMountContext, parameters: AppMountParameters) {
  /**
   * The application DOM node should take all available space.
   */
  parameters.element.style.display = 'flex';
  parameters.element.style.flexGrow = '1';

  ReactDOM.render(<AppRoot context={context} parameters={parameters} />, parameters.element);

  return () => {
    ReactDOM.unmountComponentAtNode(parameters.element);
  };
}

const AppRoot = React.memo(
  ({ context, parameters }: { context: AppMountContext; parameters: AppMountParameters }) => {
    const dataAccessLayer: DataAccessLayer = useMemo(
      () => resolverMockDataAccessLayerWithNoAncestorsTwoChildren().dataAccessLayer,
      []
    );

    const store = useMemo(() => {
      return resolverStoreFactory(dataAccessLayer);
    }, [dataAccessLayer]);

    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={context.core}>
            <ResolverReduxProvider store={store}>
              <Wrapper>
                <ResolverWithoutProviders
                  databaseDocumentID=""
                  resolverComponentInstanceID="test"
                />
              </Wrapper>
            </ResolverReduxProvider>
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
