/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createBrowserHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { Subject } from 'rxjs';
import { Store } from 'redux';
import { SyntheticsSharedContext } from '../synthetics/contexts/synthetics_shared_context';
import { SyntheticsEmbeddableStateContextProvider } from '../synthetics/contexts/synthetics_embeddable_context';
import { getSyntheticsAppProps } from '../synthetics/render_app';
import { SyntheticsSettingsContextProvider } from '../synthetics/contexts';

export const SyntheticsEmbeddableContext: React.FC<
  React.PropsWithChildren<{
    reload$: Subject<boolean>;
    reduxStore?: Store;
  }>
> = ({ reload$, children, reduxStore }) => {
  const props = getSyntheticsAppProps();

  return (
    <SyntheticsSharedContext {...props} reload$={reload$} reduxStore={reduxStore}>
      <SyntheticsEmbeddableStateContextProvider>
        <Router history={createBrowserHistory()}>
          <SyntheticsSettingsContextProvider {...props}>
            {children}
          </SyntheticsSettingsContextProvider>
        </Router>
      </SyntheticsEmbeddableStateContextProvider>
    </SyntheticsSharedContext>
  );
};
