/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchConnectorsMock } from '@kbn/content-connectors-plugin/public/plugin.mock';

import React from 'react';

import { act } from '@testing-library/react';
import { getContext } from 'kea';

import { Observable } from 'rxjs';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { searchNavigationMock } from '@kbn/search-navigation/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import { KibanaLogic } from './shared/kibana';

import { renderApp, renderHeaderActions } from '.';

describe('renderApp', () => {
  let kibanaDeps: any;
  let pluginData: any;
  let mockContainer: HTMLElement;
  let unmount: undefined | (() => void);
  let unmountHeaderActions: undefined | (() => void);

  beforeEach(() => {
    jest.clearAllMocks();
    kibanaDeps = {
      core: coreMock.createStart(),
      params: coreMock.createAppMountParameters(),
      plugins: {
        charts: chartPluginMock.createStartContract(),
        contentConnectors: searchConnectorsMock.createStart(),
        data: dataPluginMock.createStartContract(),
        indexManagement: {
          getIndexMappingComponent: jest.fn(),
        },
        lens: lensPluginMock.createStartContract(),
        licensing: licensingMock.createStart(),
        ml: mlPluginMock.createStartContract(),
        navigation: navigationPluginMock.createStartContract(),
        searchNavigation: searchNavigationMock.createStart(),
        security: securityMock.createStart(),
        share: sharePluginMock.createStartContract(),
        uiActions: uiActionsPluginMock.createStartContract(),
        user: {},
      },
      updateSideNavDefinition: jest.fn(),
    } as any;
    pluginData = {
      config: {},
      data: {},
    } as any;
    mockContainer = kibanaDeps.params.element;
    unmount = undefined;
    unmountHeaderActions = undefined;
  });

  afterEach(() => {
    if (unmountHeaderActions) {
      act(() => unmountHeaderActions?.());
      unmountHeaderActions = undefined;
    }
    if (unmount) {
      act(() => unmount?.());
      unmount = undefined;
    }
  });
  const MockApp = () => (
    <div className="hello-world">
      {i18n.translate('xpack.enterpriseSearch.mockApp.div.helloWorldLabel', {
        defaultMessage: 'Hello world',
      })}
    </div>
  );

  it('mounts and unmounts UI', () => {
    act(() => {
      unmount = renderApp(MockApp, kibanaDeps, pluginData);
    });
    expect(mockContainer.querySelector('.hello-world')).not.toBeNull();

    act(() => unmount?.());
    unmount = undefined;
    expect(mockContainer.innerHTML).toEqual('');
  });

  /**
   * Helper for automatically mounting and unmounting future tests
   */
  const mount = (App: React.FC) => {
    act(() => {
      unmount = renderApp(App, kibanaDeps, pluginData);
    });
  };

  describe('renderHeaderActions', () => {
    const MockHeaderActions = () => (
      <button className="hello-world">
        <FormattedMessage
          id="xpack.enterpriseSearch.mockHeaderActions.button.helloWorldLabel"
          defaultMessage="Hello World"
        />
      </button>
    );

    it('mounts and unmounts any HeaderActions component', () => {
      const mockHeaderEl = document.createElement('header');
      const store = getContext().store;

      act(() => {
        unmountHeaderActions = renderHeaderActions(
          MockHeaderActions,
          store,
          { theme$: new Observable() } as any,
          mockHeaderEl
        );
      });
      expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();

      act(() => unmountHeaderActions?.());
      unmountHeaderActions = undefined;
      expect(mockHeaderEl.innerHTML).toEqual('');
    });

    it('passes a renderHeaderActions helper to KibanaLogic, which can be used by our apps to render HeaderActions', () => {
      const mockHeaderEl = document.createElement('header');
      // Setup
      kibanaDeps.params.setHeaderActionMenu.mockImplementationOnce((cb: any) => {
        unmountHeaderActions = cb(mockHeaderEl);
        return unmountHeaderActions;
      });
      mount(MockApp);

      // Call KibanaLogic's renderHeaderActions, which should call params.setHeaderActionMenu
      act(() => {
        KibanaLogic.values.renderHeaderActions(MockHeaderActions);
      });
      expect(kibanaDeps.params.setHeaderActionMenu).toHaveBeenCalled();

      // renderHeaderActions should have been called and generated the correct DOM
      expect(mockHeaderEl.querySelector('.hello-world')).not.toBeNull();
    });
  });
});
