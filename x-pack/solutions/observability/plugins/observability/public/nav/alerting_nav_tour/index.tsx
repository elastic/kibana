/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { AlertingNavTour } from './alerting_nav_tour';

/** Mounts promo + tour outside any single app so navigation does not unmount the tour. */
export const mountAlertingNavTour = (coreStart: CoreStart): (() => void) => {
  const container = document.createElement('div');
  container.setAttribute('data-test-subj', 'alertingNavTourRoot');
  document.body.appendChild(container);

  ReactDOM.render(
    coreStart.rendering.addContext(<AlertingNavTour coreStart={coreStart} />),
    container
  );

  return () => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  };
};
