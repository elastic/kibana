/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

process.env.EVALUATION_CONNECTOR_ID ??= 'pmeClaudeV45SonnetUsEast1';

// Default to 1 worker for maximum stability; can be increased once everything is green.
const DEFAULT_WORKERS = 1;
const WORKERS = process.env.SECURITY_SOLUTION_EVALS_WORKERS
    ? parseInt(process.env.SECURITY_SOLUTION_EVALS_WORKERS, 10)
    : DEFAULT_WORKERS;

/**
 * Skills-based eval suite (exercises OneAgent skills via invoke_skill),
 * only suite in this package.
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

