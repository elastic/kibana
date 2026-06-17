/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRawIdentifiersMaintainerSuite } from '../../fixtures/maintainers/raw_identifiers_maintainer_suite';

// Generic watermark coverage for raw_identifiers-based relationship maintainers.
// Add a new entry here as each maintainer is onboarded (depends_on, supervises, …);
// the shared suite seeds host entities, runs the maintainer, and asserts the
// entity.lifecycle.last_seen watermark gate end-to-end.
registerRawIdentifiersMaintainerSuite({
  maintainerId: 'administers',
  relationshipKey: 'administers',
  entityPrefix: 'adm',
  requiredEntitySource: 'entityanalytics_ad',
});
