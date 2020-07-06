/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { PluginSetupContract as AlertingSetup } from '../../../../../../plugins/alerts/public';
import { AlertType, SanitizedAlert } from '../../../../../../plugins/alerts/common';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../../../../plugins/triggers_actions_ui/public';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerts: AlertingSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export class AlertingFixturePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { alerts, triggers_actions_ui }: AlertingExamplePublicSetupDeps) {
    alerts.registerNavigation(
      'consumer-noop',
      'test.noop',
      (alert: SanitizedAlert, alertType: AlertType) => `/alert/${alert.id}`
    );

    triggers_actions_ui.alertTypeRegistry.register({
      id: 'test.always-firing',
      name: 'Test Always Firing',
      iconClass: 'alert',
      alertParamsExpression: () => React.createElement('div', null, 'Test Always Firing'),
      validate: () => {
        return { errors: {} };
      },
      requiresAppContext: false,
    });

    triggers_actions_ui.alertTypeRegistry.register({
      id: 'test.noop',
      name: 'Test Noop',
      iconClass: 'alert',
      alertParamsExpression: () => React.createElement('div', null, 'Test Noop'),
      validate: () => {
        return { errors: {} };
      },
      requiresAppContext: false,
    });

    core.application.register({
      id: 'consumer-noop',
      title: 'No Op App',
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });
  }

  public start() {}
  public stop() {}
}
