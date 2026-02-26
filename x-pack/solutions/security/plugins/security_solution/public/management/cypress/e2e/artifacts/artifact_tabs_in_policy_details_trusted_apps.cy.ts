/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';
import { getArtifactTabsTests } from '../../support/artifact_tabs_in_policy_details_runner';

describe(
  'Artifact tabs in Policy Details - Trusted applications',
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
  getArtifactTabsTests([getArtifactsListTestDataForArtifact('trustedApps')])
);
