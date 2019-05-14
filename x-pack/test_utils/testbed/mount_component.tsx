/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';

import { mountWithIntl } from '../enzyme_helpers';
import { WithMemoryRouter, WithRoute } from '../router_helpers';
import { WithStore } from '../redux_helpers';
import { MemoryRouterConfig } from './types';

export const mountComponent = (
  Component: ComponentType,
  memoryRouter: MemoryRouterConfig,
  store: Store | null,
  props: any
): ReactWrapper => {
  const wrapWithRouter = memoryRouter.wrapComponent !== false;

  let Comp;

  if (wrapWithRouter) {
    const { componentRoutePath, onRouter, initialEntries, initialIndex } = memoryRouter!;

    // Wrap the componenet with a MemoryRouter and attach it to a react-router <Route />
    Comp = WithMemoryRouter(initialEntries, initialIndex)(
      WithRoute(componentRoutePath, onRouter)(Component)
    );

    // Add the Redux Provider
    if (store !== null) {
      Comp = WithStore(store)(Comp);
    }
  } else {
    Comp = store !== null ? WithStore(store)(Component) : Component;
  }

  return mountWithIntl(<Comp {...props} />);
};

export const getJSXComponentWithProps = (Component: ComponentType, props: any) => (
  <Component {...props} />
);
