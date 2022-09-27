/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { EuiPage, EuiText } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

export interface AlertingExampleComponentParams {
  basename: string;
}

const AlertingExampleApp = (deps: AlertingExampleComponentParams) => {
  const { basename } = deps;
  return (
    <Router basename={basename}>
      <EuiPage>
        <Route
          path={`/rule/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <EuiText data-test-subj="noop-title">
                <h2>View Rule {props.match.params.id}</h2>
              </EuiText>
            );
          }}
        />
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  core: CoreStart,
  deps: any,
  { appBasePath, element }: AppMountParameters
) => {
  const root = createRoot(element);
  root.render(<AlertingExampleApp basename={appBasePath} {...deps} />);

  return () => root.unmount();
};
