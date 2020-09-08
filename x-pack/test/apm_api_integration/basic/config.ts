/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestConfig } from '../common/config';
import archivesMetadata from './archives_metadata.json';

export default createTestConfig({
  license: 'basic',
  name: 'X-Pack APM API integration tests (basic)',
  testFiles: [require.resolve('./tests')],
});

export const archives: Record<string, { from: string; to: string }> = archivesMetadata as any;
