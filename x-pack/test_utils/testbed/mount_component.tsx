/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { mountWithIntl } from '../enzyme_helpers';
import { WithMemoryRouter, WithRoute } from '../router_helpers';
import { WithStore } from '../redux_helpers';
import { MemoryRouterConfig } from './types';

interface Config {
  Component: ComponentType;
  memoryRouter: MemoryRouterConfig;
  store: Store | null;
  props: any;
  onRouter: (router: any) => void;
}

const getCompFromConfig = ({ Component, memoryRouter, store, onRouter }: Config): ComponentType => {
  const wrapWithRouter = memoryRouter.wrapComponent !== false;

  let Comp: ComponentType = store !== null ? WithStore(store)(Component) : Component;

  if (wrapWithRouter) {
    const { componentRoutePath, initialEntries, initialIndex } = memoryRouter!;

    // Wrap the componenet with a MemoryRouter and attach it to a react-router <Route />
    Comp = WithMemoryRouter(initialEntries, initialIndex)(
      WithRoute(componentRoutePath, onRouter)(Comp)
    );
  }

  return Comp;
};

export const mountComponentSync = (config: Config): ReactWrapper => {
  const Comp = getCompFromConfig(config);
  return mountWithIntl(<Comp {...config.props} />);
};

export const mountComponentAsync = async (config: Config): Promise<ReactWrapper> => {
  const Comp = getCompFromConfig(config);

  /**
   * In order for hooks with effects to work in our tests
   * we need to wrap the mounting under the new act "async"
   * that ships with React 16.9.0
   *
   * https://github.com/facebook/react/pull/14853
   * https://github.com/threepointone/react-act-examples/blob/master/sync.md
   */
  let component: ReactWrapper;

  // @ts-ignore
  await act(async () => {
    component = mountWithIntl(<Comp {...config.props} />);
  });

  // @ts-ignore
  return component;
};

export const getJSXComponentWithProps = (Component: ComponentType, props: any) => (
  <Component {...props} />
);
