/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import type { FocusedSignificantEventService } from '../chat/focused_significant_event_service';
import type { NightshiftStartDependencies } from '../types';
import { AppRoot } from './app_root';

export function renderApp({
  appMountParameters,
  coreStart,
  pluginsStart,
  isServerless,
  focusedSignificantEventService,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  isServerless: boolean;
  focusedSignificantEventService: FocusedSignificantEventService;
}) {
  const { element } = appMountParameters;

  const previousOverflow = element.style.overflow;
  element.style.overflow = 'auto';

  ReactDOM.render(
    coreStart.rendering.addContext(
      <AppRoot
        appMountParameters={appMountParameters}
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        isServerless={isServerless}
        focusedSignificantEventService={focusedSignificantEventService}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
    element.style.overflow = previousOverflow;
  };
}
