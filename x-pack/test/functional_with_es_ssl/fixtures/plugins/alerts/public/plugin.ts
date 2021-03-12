/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { PluginSetupContract as AlertingSetup } from '../../../../../../plugins/alerting/public';
import { AlertType, SanitizedAlert } from '../../../../../../plugins/alerting/common';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../../../../plugins/triggers_actions_ui/public';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export class AlertingFixturePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(core: CoreSetup, { alerting, triggersActionsUi }: AlertingExamplePublicSetupDeps) {
    alerting.registerNavigation(
      'alerting_fixture',
      'test.noop',
      (alert: SanitizedAlert, alertType: AlertType) => `/alert/${alert.id}`
    );

    triggersActionsUi.alertTypeRegistry.register({
      id: 'test.always-firing',
      description: 'Always fires',
      iconClass: 'alert',
      documentationUrl: null,
      alertParamsExpression: () => React.createElement('div', null, 'Test Always Firing'),
      validate: () => {
        return { errors: {} };
      },
      requiresAppContext: false,
    });

    triggersActionsUi.alertTypeRegistry.register({
      id: 'test.noop',
      description: `Doesn't do anything`,
      iconClass: 'alert',
      documentationUrl: null,
      alertParamsExpression: () => React.createElement('div', null, 'Test Noop'),
      validate: () => {
        return { errors: {} };
      },
      requiresAppContext: false,
    });

    core.application.register({
      id: 'alerting_fixture',
      title: 'Alerting Fixture App',
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
