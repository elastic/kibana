/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { TestProviders, createMockStore, mockGlobalState } from '../../common/mock';
import type { ResolverState } from '../types';
import { createMemoryHistory } from 'history';
import { coreMock } from '@kbn/core/public/mocks';
import { DetailsPanel } from './details_panel';
import { EMPTY_RESOLVER } from '../store/helpers';
import { uiSetting } from '../mocks/ui_setting';
import '../test_utilities/extend_jest';

const defaultInstanceID = 'details-panel-test';
const parameters = { databaseDocumentID: 'id', indices: [], agentId: '', filters: {} };
const schema = { id: 'id', parent: 'parent' };
const dataSource = 'data source';

const renderDetailsPanel = ({
  resolverComponentInstanceID = defaultInstanceID,
  reduxState = EMPTY_RESOLVER,
}: {
  resolverComponentInstanceID?: string;
  reduxState?: ResolverState;
}) => {
  // Create a redux store with top level global redux state
  const store = createMockStore(
    {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          analyzer: {
            ...mockGlobalState.sourcerer.sourcererScopes.default,
            selectedPatterns: [],
          },
        },
      },
      analyzer: {
        'details-panel-test': reduxState,
      },
    },
    undefined,
    undefined,
    undefined
  );

  // If needed, create a fake 'history' instance.
  // Resolver will use to read and write query string values.
  const history = createMemoryHistory();

  // Used for `KibanaContextProvider`
  const coreStart = coreMock.createStart();
  coreStart.settings.client.get.mockImplementation(uiSetting);

  return render(
    <TestProviders>
      <I18nProvider>
        <Router history={history}>
          <Provider store={store}>
            <DetailsPanel resolverComponentInstanceID={resolverComponentInstanceID} />
          </Provider>
        </Router>
      </I18nProvider>
    </TestProviders>
  );
};

describe('<DetailsPanel />', () => {
  describe('When resolver is not initialized', () => {
    it('should display a loading state', () => {
      const { getByTestId } = renderDetailsPanel({
        resolverComponentInstanceID: 'test', // not in store
      });
      expect(getByTestId('resolver:panel:loading')).toBeInTheDocument();
    });
  });

  describe('When resolver is initialized', () => {
    it('should display a loading state when resolver data is loading', () => {
      const reduxState: ResolverState = {
        ...EMPTY_RESOLVER,
        data: {
          ...EMPTY_RESOLVER.data,
          tree: {
            pendingRequestParameters: parameters,
          },
        },
      };

      const { getByTestId } = renderDetailsPanel({ reduxState });
      expect(getByTestId('resolver:panel:loading')).toBeInTheDocument();
    });

    it("should display error message when entities request doesn't return any data", () => {
      const reduxState: ResolverState = {
        ...EMPTY_RESOLVER,
        data: {
          ...EMPTY_RESOLVER.data,
          tree: {
            ...EMPTY_RESOLVER.data.tree,
            lastResponse: {
              parameters,
              successful: false,
            },
          },
        },
      };

      const { getByTestId, getByText } = renderDetailsPanel({ reduxState });
      expect(getByTestId('resolver:panel:error')).toBeInTheDocument();
      expect(getByText('Error loading data.')).toBeInTheDocument();
    });

    it("should display a no data message when resolver tree request doesn't return any data", () => {
      const reduxState: ResolverState = {
        ...EMPTY_RESOLVER,
        data: {
          ...EMPTY_RESOLVER.data,
          tree: {
            ...EMPTY_RESOLVER.data.tree,
            lastResponse: {
              parameters,
              schema,
              dataSource,
              successful: true,
              result: { originID: '', nodes: [] },
            },
          },
        },
      };

      const { getByTestId } = renderDetailsPanel({ reduxState });
      expect(getByTestId('resolver:no-process-events')).toBeInTheDocument();
    });

    it('should display the node panel when both queries resolve successfaully', () => {
      const reduxState: ResolverState = {
        ...EMPTY_RESOLVER,
        data: {
          ...EMPTY_RESOLVER.data,
          tree: {
            ...EMPTY_RESOLVER.data.tree,
            lastResponse: {
              parameters,
              schema,
              dataSource,
              successful: true,
              result: {
                originID: 'id',
                nodes: [
                  {
                    id: 'node',
                    data: { 'host.name': 'test' },
                    stats: { total: 1, byCategory: {} },
                  },
                ],
              },
            },
          },
        },
      };

      const { getByTestId } = renderDetailsPanel({ reduxState });
      expect(getByTestId('resolver:node-list')).toBeInTheDocument();
    });
  });
});
