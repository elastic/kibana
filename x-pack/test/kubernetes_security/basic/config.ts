/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// eslint-disable-next-line import/no-default-export
export default createTestConfig({
  license: 'basic',
  name: 'X-Pack kubernetes_security API integration tests (basic)',
  testFiles: [require.resolve('./tests')],
});
