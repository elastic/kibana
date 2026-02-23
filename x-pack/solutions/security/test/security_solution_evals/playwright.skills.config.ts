/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

process.env.EVALUATION_CONNECTOR_ID ??= 'pmeClaudeV45SonnetUsEast1';

/**
 * Default to 2 workers for parallel execution.
 *
 * All tests are designed to run in isolation:
 * - Each worker runs in its own Kibana space (e.g., `skills-evals-w1`, `skills-evals-w2`)
 * - Test data is created with worker-specific prefixes to avoid conflicts
 * - Anomaly tests create worker-scoped ML indices (e.g., `.ml-anomalies-security_auth-skills-evals-w1`)
 *
 * Increase workers for faster execution (recommended: 2-4 depending on available resources).
 */
const DEFAULT_WORKERS = 2;
const WORKERS = process.env.SECURITY_SOLUTION_EVALS_WORKERS
  ? parseInt(process.env.SECURITY_SOLUTION_EVALS_WORKERS, 10)
  : DEFAULT_WORKERS;

/**
 * Skills-based eval suite (exercises Agent Builder skills via invoke_skill).
 */
const config = createPlaywrightEvalsConfig({
    testDir: Path.join(__dirname, './evals_skills'),
    repetitions: 1,
    timeout: 10 * 60_000, // 10 minutes timeout
});

export default {
    ...config,
    globalTeardown: Path.join(__dirname, './src/global_teardown.ts'),
    ...(WORKERS ? { workers: WORKERS } : {}),
    // Enable headed mode if HEADED environment variable is set
    use: {
        ...config.use,
        headless: process.env.HEADED !== 'true' && process.env.HEADED !== '1',
    },
};

