/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { AppRoot } from '.';
import type { SignificantEventsAppServices } from '../services/types';
import type { SignificantEventsAppStartDependencies } from '../types';

export function renderApp({
  appMountParameters,
  services,
  coreStart,
  pluginsStart,
}: {
  appMountParameters: AppMountParameters;
  services: SignificantEventsAppServices;
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
}) {
  const { element } = appMountParameters;

  const previousOverflow = element.style.overflow;
  element.style.overflow = 'auto';

  ReactDOM.render(
    coreStart.rendering.addContext(
      <AppRoot
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        services={services}
        appMountParameters={appMountParameters}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
    element.style.overflow = previousOverflow;
  };
}
