/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { ES_RESOURCES } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/serverless';
import type { FtrProviderContext } from './runner';
import { SecuritySolutionCypressTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const securitySolutionCypressConfig = await readConfigFile(
    require.resolve('./security_config.base.ts')
  );

  return {
    ...securitySolutionCypressConfig.getAll(),

    esServerlessOptions: {
      ...(securitySolutionCypressConfig.has('esServerlessOptions')
        ? securitySolutionCypressConfig.get('esServerlessOptions') ?? {}
        : {}),
      resources: Object.values(ES_RESOURCES),
    },

    testRunner: (context: FtrProviderContext) => SecuritySolutionCypressTestRunner(context),
  };
}
