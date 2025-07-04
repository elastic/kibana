/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

const dashboardsPermission = {
  dashboard_v2: ['all'],
};

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.base.ts'));
  const baseConfigParams = baseConfig.getAll();

  return {
    ...baseConfigParams,
    security: {
      ...baseConfigParams.security,
      roles: {
        ...baseConfigParams.security.roles,
        stack_alerting: {
          kibana: [
            {
              feature: {
                stackAlerts: ['all'],
                ...dashboardsPermission,
              },
              spaces: ['*'],
            },
          ],
        },
        observability_alerting: {
          kibana: [
            {
              feature: {
                logs: ['all'],
                ...dashboardsPermission,
              },
              spaces: ['*'],
            },
          ],
        },
        security_alerting: {
          kibana: [
            {
              feature: {
                siemV2: ['all'],
                ...dashboardsPermission,
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: {
            indices: [
              {
                names: ['*'],
                privileges: ['all'],
                field_security: {
                  grant: ['*'],
                  except: [],
                },
              },
            ],
          },
        },
      },
    },
    testFiles: [require.resolve('.')],
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Embeddable Alerts Table',
    },
  };
}
