/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

import createTestConfig from './config';

export default async function createTestConfig2(
  context: FtrConfigProviderContext
): Promise<Awaited<ReturnType<typeof createTestConfig>>> {
  const config = await createTestConfig(context);
  return {
    ...config,
    testFiles: [require.resolve('./index_2.ts')],
  };
}
