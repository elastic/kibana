/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';

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
      (alert: SanitizedRule) => `/rule/${alert.id}`
    );

    triggersActionsUi.ruleTypeRegistry.register({
      id: 'test.always-firing',
      description: 'Always fires',
      iconClass: 'alert',
      documentationUrl: null,
      ruleParamsExpression: () => React.createElement('div', null, 'Test Always Firing'),
      validate: () => {
        return { errors: {} };
      },
      requiresAppContext: false,
    });

    triggersActionsUi.ruleTypeRegistry.register({
      id: 'test.noop',
      description: `Doesn't do anything`,
      iconClass: 'alert',
      documentationUrl: null,
      ruleParamsExpression: () => React.createElement('div', null, 'Test Noop'),
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
