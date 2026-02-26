/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';
import { getArtifactMockedDataTests } from '../../support/artifacts_rbac_runner';

const siemVersionFilter = (versions: string[]) => versions.filter((v) => v === 'siemV5');

describe(
  'Blocklist RBAC (siemV5)',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('blocklists'), {
    siemVersionFilter,
  })
);

describe(
  'Event filters RBAC (siemV5)',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('eventFilters'), {
    siemVersionFilter,
  })
);

describe(
  'Host Isolation Exceptions RBAC (siemV5)',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('hostIsolationExceptions'), {
    siemVersionFilter,
  })
);

describe(
  'Trusted apps RBAC (siemV5)',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('trustedApps'), {
    siemVersionFilter,
  })
);

describe(
  'Trusted devices RBAC (siemV5)',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  getArtifactMockedDataTests(getArtifactsListTestDataForArtifact('trustedDevices'), {
    siemVersionFilter,
  })
);
