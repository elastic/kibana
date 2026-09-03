/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, AppUnmount, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { ObservabilityAlertingApp } from './observability_alerting_app';
import { createObservabilityAlertingSetBreadcrumbs } from './breadcrumbs';

export const mountObservabilityAlertingApp = ({
  coreStart,
  alertingVTwo,
  triggersActionsUi,
  params,
}: {
  coreStart: CoreStart;
  alertingVTwo: AlertingV2PublicStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  params: AppMountParameters;
}): AppUnmount => {
  const { element, history } = params;
  element.classList.add(APP_WRAPPER_CLASS);

  const setBreadcrumbs = createObservabilityAlertingSetBreadcrumbs({
    application: coreStart.application,
    chrome: coreStart.chrome,
    history,
  });

  ReactDOM.render(
    coreStart.rendering.addContext(
      <Router history={history}>
        <ObservabilityAlertingApp
          coreStart={coreStart}
          alertingVTwo={alertingVTwo}
          triggersActionsUi={triggersActionsUi}
          setBreadcrumbs={setBreadcrumbs}
        />
      </Router>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
