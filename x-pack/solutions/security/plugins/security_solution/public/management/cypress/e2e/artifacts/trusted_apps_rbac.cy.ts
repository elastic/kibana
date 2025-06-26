/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';
import { getArtifactMockedDataTests } from '../../support/artifacts_rbac_runner';

// Tests are not stable following the enablement of feature flag for space awareness. Issue is
// being worked and these will be re-enabled soon.
describe.skip(
  'Trusted apps RBAC',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },

  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('trustedApps'))
);
