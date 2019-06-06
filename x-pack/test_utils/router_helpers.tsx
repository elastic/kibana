/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ComponentType } from 'react';
import PropTypes from 'prop-types';
import { MemoryRouter, Route } from 'react-router-dom';
import * as H from 'history';

export const WithMemoryRouter = (initialEntries: string[] = ['/'], initialIndex: number = 0) => (
  WrappedComponent: ComponentType
) => (props: any) => (
  <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
    <WrappedComponent {...props} />
  </MemoryRouter>
);

export const WithRoute = (componentRoutePath = '/', onRouter = (router: MemoryRouter) => {}) => (
  WrappedComponent: ComponentType
) => {
  return class extends Component {
    static contextTypes = {
      router: PropTypes.object,
    };

    componentDidMount() {
      const { router } = this.context;
      onRouter(router);
    }

    render() {
      return (
        <Route
          path={componentRoutePath}
          render={props => <WrappedComponent {...props} {...this.props} />}
        />
      );
    }
  };
};

interface Router {
  history: Partial<H.History>;
  route: {
    location: H.Location;
  };
}

export const reactRouterMock: Router = {
  history: {
    push: () => {},
    createHref: location => location.pathname!,
    location: {
      pathname: '',
      search: '',
      state: '',
      hash: '',
    },
  },
  route: {
    location: {
      pathname: '',
      search: '',
      state: '',
      hash: '',
    },
  },
};
