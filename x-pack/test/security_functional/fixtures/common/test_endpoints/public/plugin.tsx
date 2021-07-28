/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from 'src/core/public';
import ReactDOM from 'react-dom';
import React from 'react';

export class TestEndpointsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    // Prevent auto-logout on server `401` errors.
    core.http.anonymousPaths.register('/authentication/app');
    core.application.register({
      id: 'authentication_app',
      title: 'Authentication app',
      appRoute: '/authentication/app',
      chromeless: true,
      async mount({ element }) {
        ReactDOM.render(
          <div data-test-subj="testEndpointsAuthenticationApp">Authenticated!</div>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }
  public start() {}
  public stop() {}
}
