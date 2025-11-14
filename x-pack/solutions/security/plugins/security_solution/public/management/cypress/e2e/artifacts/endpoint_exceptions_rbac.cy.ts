/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';
import { getArtifactMockedDataTests } from '../../support/artifacts_rbac_runner';

describe(
  'Endpoint Exceptions RBAC',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'endpointExceptionsMovedUnderManagement',
          ])}`,
        ],
      },
    },
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },

  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('endpointExceptions'))
);
