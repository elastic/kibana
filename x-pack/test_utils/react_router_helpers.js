/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import PropTypes from 'prop-types';

export function withRoute(WrappedComponent, componentRoutePath = '/', onRouter = () => {}) {
  return class extends Component {
    static contextTypes = {
      router: PropTypes.object
    };

    componentDidMount() {
      const { router } = this.context;
      onRouter(router);
    }

    render() {
      return (
        <Route
          path={componentRoutePath}
          render={(props) => <WrappedComponent {...props} {...this.props} />}
        />
      );
    }
  };
}
