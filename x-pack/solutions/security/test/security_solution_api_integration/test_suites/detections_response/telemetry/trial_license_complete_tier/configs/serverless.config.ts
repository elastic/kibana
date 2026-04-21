/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { createTestConfig } from '../../../../../config/serverless/config.base';

const baseConfig = createTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'Detection Engine - Telemetry Integration Tests - Serverless Env - Complete Tier',
  },
  kbnTestServerArgs: [
    `--xpack.securitySolution.enableExperimental=${JSON.stringify(['previewTelemetryUrlEnabled'])}`,
  ],
});

export default async (context: FtrConfigProviderContext) => {
  const config = await baseConfig(context);
  return {
    ...config,
    // DEBUG: disable CI log capture so our debug logger.info lines stream to
    // the Buildkite console instead of being buffered and only dumped on test
    // failure.
    mochaReporter: {
      captureLogOutput: false,
    },
  };
};
