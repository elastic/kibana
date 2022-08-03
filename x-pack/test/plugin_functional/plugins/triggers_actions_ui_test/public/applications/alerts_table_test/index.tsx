/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Router } from 'react-router-dom';
import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';

type CoreStartTriggersActionsUI = CoreStart & {
  data: DataPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
};

/**
 * Render the TriggersActionsUI Test app. Returns a cleanup function.
 */
export function renderApp(coreStart: CoreStartTriggersActionsUI, parameters: AppMountParameters) {
  ReactDOM.render(<AppRoot coreStart={coreStart} parameters={parameters} />, parameters.element);

  return () => {
    ReactDOM.unmountComponentAtNode(parameters.element);
  };
}

const AppRoot = React.memo(
  ({
    coreStart,
    parameters,
  }: {
    coreStart: CoreStartTriggersActionsUI;
    parameters: AppMountParameters;
  }) => {
    const { triggersActionsUi } = coreStart;
    const { alertsTableConfigurationRegistry, getAlertsStateTable } = triggersActionsUi;

    const alertStateProps: AlertsTableStateProps = {
      configurationId: 'triggersActionsUiTestId',
      id: `alerts-table-test`,
      alertsTableConfigurationRegistry,
      featureIds: [
        AlertConsumers.INFRASTRUCTURE,
        AlertConsumers.APM,
        AlertConsumers.OBSERVABILITY,
        AlertConsumers.LOGS,
      ],
      query: {
        bool: {
          filter: [],
        },
      },
      showExpandToDetails: true,
    };

    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={coreStart}>
            <EuiThemeProvider>{getAlertsStateTable(alertStateProps)}</EuiThemeProvider>
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  }
);
