/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export const TEST_SPACE_1 = 'test1';

export function setupTestSpaces(providerContex: FtrProviderContext) {
  const kibanaServer = providerContex.getService('kibanaServer');
  before(async () =>
    Promise.all([
      kibanaServer.spaces
        .create({
          id: TEST_SPACE_1,
          name: TEST_SPACE_1,
        })
        .catch((err) => {}),
    ])
  );
}
