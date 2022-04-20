/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { debounce, filter, first } from 'rxjs/operators';
import { timer } from 'rxjs';

export class TestEndpointsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    // Prevent auto-logout on server `401` errors.
    core.http.anonymousPaths.register('/authentication/app');

    const networkIdle$ = core.http.getLoadingCount$().pipe(
      debounce(() => timer(3000)),
      filter((count) => count === 0),
      first()
    );

    core.application.register({
      id: 'authentication_app',
      title: 'Authentication app',
      appRoute: '/authentication/app',
      chromeless: true,
      async mount({ element }) {
        // Promise is resolved as soon there are no requests has been made in the last 3 seconds. We need this to make
        // sure none of the unrelated requests interferes with the test logic.
        networkIdle$.toPromise().then(() => {
          ReactDOM.render(
            <div data-test-subj="testEndpointsAuthenticationApp">Authenticated!</div>,
            element
          );
        });
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }
  public start() {}
  public stop() {}
}
