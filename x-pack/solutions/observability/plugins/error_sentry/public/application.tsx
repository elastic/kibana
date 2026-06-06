/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { ErrorSentryApp } from './components/app';
import type { ErrorSentryPublicStartDeps } from './plugin';

export const renderApp = (
  core: CoreStart,
  plugins: ErrorSentryPublicStartDeps,
  { element }: AppMountParameters
): (() => void) => {
  ReactDOM.render(
    core.rendering.addContext(
      <ErrorSentryApp core={core} agentBuilder={plugins.agentBuilder} />
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
