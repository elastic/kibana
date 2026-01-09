/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { FullConfig } from '@playwright/test';
import { createEsClientForTesting } from '@kbn/test';
import { EvaluationScoreRepository } from '@kbn/evals/src/utils/score_repository';
import { createDefaultTerminalReporter } from '@kbn/evals';

function getRunId(): string | undefined {
    return process.env.TEST_RUN_ID;
}

function readScoutConfig(serversConfigDir: string, configName: string): any {
    const configPath = path.join(serversConfigDir, `${configName}.json`);
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

export default async function globalTeardown(config: FullConfig) {
    // Only print the aggregated summary when running with multiple workers.
    // With a single worker, the per-worker terminal reporter output is typically sufficient.
    if (typeof config.workers === 'number' && config.workers <= 1) return;

    const runId = getRunId();
    if (!runId) {
        // eslint-disable-next-line no-console
        console.error('[security_solution_evals] TEST_RUN_ID is not set; cannot print summary.');
        return;
    }

    const firstProjectUse = config.projects[0]?.use as undefined | { serversConfigDir?: string; configName?: string };
    const serversConfigDir = firstProjectUse?.serversConfigDir;
    const configName = firstProjectUse?.configName;

    if (!serversConfigDir || !configName) {
        // eslint-disable-next-line no-console
        console.error(
            '[security_solution_evals] Could not resolve Scout config (serversConfigDir/configName); cannot print summary.'
        );
        return;
    }

    const scoutConfig = readScoutConfig(serversConfigDir, configName) as {
        hosts: { elasticsearch: string };
        auth: { username: string; password: string };
        isCloud?: boolean;
    };

    const esClient = createEsClientForTesting({
        esUrl: scoutConfig.hosts.elasticsearch,
        isCloud: Boolean(scoutConfig.isCloud),
        authOverride: {
            username: scoutConfig.auth.username,
            password: scoutConfig.auth.password,
        },
    });

    const log = {
        info: (msg: unknown) => console.log(msg),
        error: (msg: unknown) => console.error(msg),
        debug: (msg: unknown) => console.debug(msg),
        warning: (msg: unknown) => console.warn(msg),
    };

    const scoreRepository = new EvaluationScoreRepository(esClient as any, log as any);
    const reporter = createDefaultTerminalReporter();

    // eslint-disable-next-line no-console
    console.log('\n\n[security_solution_evals] Aggregated evaluation summary (all workers)\n');
    await reporter(scoreRepository as any, runId, log as any);
}


