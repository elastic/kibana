/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));
  const baseConfig = functionalConfig.getAll();

  baseConfig.security.roles.index_management_manage_index_templates = {
    elasticsearch: {
      cluster: ['manage_index_templates'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['*'],
      },
    ],
  };

  baseConfig.security.roles.index_management_monitor_only = {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['*'],
      },
    ],
  };

  baseConfig.security.roles.index_management_manage_enrich_only = {
    elasticsearch: {
      cluster: ['manage_enrich'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['*'],
      },
    ],
  };

  baseConfig.security.roles.index_management_monitor_enrich_only = {
    elasticsearch: {
      cluster: ['monitor_enrich'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['*'],
      },
    ],
  };

  return {
    ...baseConfig,
    testFiles: [require.resolve('.')],
  };
}
