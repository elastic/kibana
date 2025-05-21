/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Alert } from '@kbn/alerting-types';
import { PluginContext, PluginContextValue } from '../../context/plugin_context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { apmAlertResponseExample } from './alerts_flyout.mock';
import { AlertsFlyout } from './alerts_flyout';

interface Args {
  alerts: Alert[];
}

export default {
  title: 'app/Alerts/AlertsFlyout',
  component: AlertsFlyout,
  decorators: [
    (Story: ComponentType) => {
      return (
        <KibanaContextProvider
          services={{
            http: { basePath: { prepend: (_: string) => '' } },
            docLinks: { links: { query: {} } },
            storage: { get: () => {} },
            uiSettings: {
              get: (setting: string) => {
                if (setting === 'dateFormat') {
                  return 'MMM D, YYYY @ HH:mm:ss.SSS';
                }
              },
            },
          }}
        >
          {' '}
          <PluginContext.Provider value={{} as PluginContextValue}>
            <Story />
          </PluginContext.Provider>
        </KibanaContextProvider>
      );
    },
  ],
};

export function Example({ alerts }: Args) {
  const selectedAlertId = apmAlertResponseExample[0]![ALERT_UUID]![0] as string;
  const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();
  return (
    <AlertsFlyout
      alerts={alerts}
      observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      selectedAlertId={selectedAlertId}
      onClose={() => {}}
    />
  );
}
Example.args = {
  alerts: apmAlertResponseExample,
} as Args;
