/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { FullConfig } from '@playwright/test';
import { createEsClientForTesting, KbnClient } from '@kbn/test';
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
    const runId = getRunId();
    const workers = typeof config.workers === 'number' ? config.workers : 1;

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
        hosts: { elasticsearch: string; kibana: string };
        auth: { username: string; password: string };
        isCloud?: boolean;
    };

    const log = {
        info: (msg: unknown) => console.log(msg),
        error: (msg: unknown) => console.error(msg),
        debug: (msg: unknown) => console.debug(msg),
        warning: (msg: unknown) => console.warn(msg),
    };

    // Cleanup eval-created connectors (persisted for the whole run to avoid evaluator flakiness).
    if (runId) {
        const urlWithAuth = (() => {
            const u = new URL(scoutConfig.hosts.kibana);
            u.username = scoutConfig.auth.username;
            u.password = scoutConfig.auth.password;
            return u.toString();
        })();

        const kbnClientForSpace = (spaceId: string) => {
            const base = urlWithAuth.replace(/\/$/, '');
            return new KbnClient({ log: log as any, url: `${base}/s/${spaceId}` });
        };

        for (let i = 1; i <= workers; i++) {
            const spaceId = `skills-evals-w${i}`;
            const kbnClient = kbnClientForSpace(spaceId);
            try {
                const res = await kbnClient.request<any>({
                    method: 'GET',
                    path: '/api/actions/connectors',
                    headers: { 'kbn-xsrf': 'true' },
                });
                const connectors: Array<{ id: string; name: string; is_preconfigured?: boolean }> = res.data;
                const prefix = `security-solution-evals:${runId}:${spaceId}:`;
                const toDelete = connectors.filter(
                    (c) => !c.is_preconfigured && typeof c.name === 'string' && c.name.startsWith(prefix)
                );

                for (const c of toDelete) {
                    await kbnClient.request({
                        method: 'DELETE',
                        path: `/api/actions/connector/${c.id}`,
                        headers: { 'kbn-xsrf': 'true' },
                        ignoreErrors: [404],
                    });
                }
                if (toDelete.length) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `[security_solution_evals] Deleted ${toDelete.length} eval connector(s) in space ${spaceId}`
                    );
                }
            } catch (e: any) {
                // eslint-disable-next-line no-console
                console.warn(
                    `[security_solution_evals] Connector cleanup failed for space ${spaceId}: ${String(
                        e?.message ?? e
                    )}`
                );
            }
        }
    }

    // Print aggregated summary only when running with multiple workers.
    if (workers > 1 && runId) {
        const esClient = createEsClientForTesting({
            esUrl: scoutConfig.hosts.elasticsearch,
            isCloud: Boolean(scoutConfig.isCloud),
            authOverride: {
                username: scoutConfig.auth.username,
                password: scoutConfig.auth.password,
            },
        });

        const scoreRepository = new EvaluationScoreRepository(esClient as any, log as any);
        const reporter = createDefaultTerminalReporter();

        // eslint-disable-next-line no-console
        console.log('\n\n[security_solution_evals] Aggregated evaluation summary (all workers)\n');
        await reporter(scoreRepository as any, runId, log as any);
    }
}


