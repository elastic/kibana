/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { PluginContextValue } from '../../context/plugin_context/plugin_context';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { apmAlertResponseExample } from './alerts_flyout.mock';
import { AlertsFlyout } from './alerts_flyout';

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

export function Example() {
  const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();
  return (
    <AlertsFlyout
      alert={apmAlertResponseExample[0]!}
      observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      onClose={() => {}}
    />
  );
}
