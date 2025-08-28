/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';
import { getArtifactMockedDataTests } from '../../support/artifacts_rbac_runner';

describe(
  'Trusted devices RBAC',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['trustedDevices'])}`,
        ],
      },
    },
  },

  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('trustedDevices'), ['siemV3'])
);
