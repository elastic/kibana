/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { randomUUID } from 'crypto';
import { CalderaClient } from './caldera/client';
import type { CalderaAbilityTemplate } from './caldera/ref7707_abilities';
import { REF7707_CALDERA_ABILITIES } from './caldera/ref7707_abilities';
import { DEFAULT_WEB_PORT, REF7707_DOMAINS } from './constants';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const trimSlash = (s: string) => s.replace(/\/$/, '');

const browserTemplate = (): CalderaAbilityTemplate => {
    const t = REF7707_CALDERA_ABILITIES.find((a) => a.name.toLowerCase().includes('browser visit'));
    if (!t) throw new Error(`Browser visit ability template not found`);
    return t;
};

const replaceTokens = (cmd: string, vars: { domain: string; webPort: number; dnsIp?: string; webIp?: string }) => {
    return cmd
        .replaceAll('#{domain}', vars.domain)
        .replaceAll('"#{domain}"', `"${vars.domain}"`)
        .replaceAll('#{web_port}', String(vars.webPort))
        .replaceAll('"#{web_port}"', `"${String(vars.webPort)}"`)
        .replaceAll('#{dns_ip}', vars.dnsIp ?? '')
        .replaceAll('"#{dns_ip}"', `"${vars.dnsIp ?? ''}"`)
        .replaceAll('#{web_ip}', vars.webIp ?? '')
        .replaceAll('"#{web_ip}"', `"${vars.webIp ?? ''}"`);
};

const runBrowserVisit: RunFn = async ({ log, flags }) => {
    createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

    const calderaUrl = (flags.calderaUrl as string) || 'http://127.0.0.1:8888';
    const calderaApiKey = (flags.calderaApiKey as string) || '';
    const group = (flags.group as string) || 'ref7707';
    const targetAgent = (flags.targetAgent as string) || '';

    const domain = (flags.domain as string) || REF7707_DOMAINS[0];
    const webPort = flags.webPort ? Number(flags.webPort) : DEFAULT_WEB_PORT;
    const dnsIp = (flags.dnsIp as string) || '';
    const webIp = (flags.webIp as string) || '';

    const attempts = flags.attempts ? Number(flags.attempts) : 25;
    const sleepMs = flags.sleepMs ? Number(flags.sleepMs) : 3000;
    const waitMs = flags.waitMs ? Number(flags.waitMs) : 180000;

    if (!calderaApiKey) throw new Error(`--calderaApiKey is required`);
    if (!targetAgent) throw new Error(`--targetAgent is required (ex: patryk-ref7707-gcp-ubuntu-2)`);

    const caldera = new CalderaClient({ calderaUrl, apiKey: calderaApiKey });
    if (!(await caldera.healthCheck())) {
        throw new Error(`Caldera health check failed at ${calderaUrl}`);
    }

    for (let attempt = 1; attempt <= attempts; attempt++) {
        log.info(`[caldera][browser] attempt ${attempt}/${attempts} targeting agent=${targetAgent}`);

        // Ensure agent exists
        const agent = await caldera.getAgentByPaw(targetAgent);
        const originalGroup = (agent?.group as string) || group;
        const runGroup = `ref7707-run-browser-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        await caldera.updateAgent(targetAgent, { group: runGroup });
        log.info(`[caldera][browser] moved agent group: ${originalGroup} -> ${runGroup}`);

        let operationId: string | undefined;
        try {
            const tmpl = browserTemplate();
            const abilityId = randomUUID();
            const abilityPayload = {
                ability_id: abilityId,
                name: `${tmpl.name} [${domain}]`,
                description: tmpl.description,
                tactic: tmpl.tactic,
                technique: tmpl.technique,
                executors: tmpl.executors.map((e) => ({
                    platform: e.platform,
                    name: e.name,
                    command: replaceTokens(e.command, {
                        domain,
                        webPort,
                        dnsIp: dnsIp || undefined,
                        webIp: webIp || undefined,
                    }),
                    ...(e.timeout ? { timeout: e.timeout } : {}),
                })),
            };

            await caldera.createAbility(abilityPayload);
            log.info(`[caldera][browser] created ability: ${abilityPayload.name} (${abilityId})`);

            const adversary = await caldera.createAdversary({
                name: `REF7707 Lab (browser-only)`,
                description: `Browser-only visit for lab debugging`,
                atomic_ordering: [abilityId],
            });
            const adversaryId = adversary?.adversary_id;
            if (!adversaryId) throw new Error(`Failed to create browser-only adversary`);

            const opName = `ref7707-browser-${Date.now()}`;
            const operation = await caldera.createOperation({
                name: opName,
                adversary: { adversary_id: adversaryId },
                state: 'running',
                autonomous: 1,
                auto_close: true,
                group: runGroup,
            });
            operationId = operation?.id;
            log.info(`[caldera][browser] created operation: ${opName}${operationId ? ` (${operationId})` : ''}`);
            if (operationId) {
                log.info(`[caldera][browser] dashboard: ${trimSlash(calderaUrl)}/#/operations/${operationId}`);
            }

            const start = Date.now();
            let links: any[] = [];
            while (Date.now() - start < waitMs) {
                if (!operationId) break;
                links = await caldera.getOperationLinks(operationId);
                const link = links[0];
                if (link?.finish) break;
                await sleep(2000);
            }

            if (!operationId) throw new Error(`Missing operation id`);
            links = await caldera.getOperationLinks(operationId);
            const link = links[0];
            if (!link) throw new Error(`No links were created by Caldera for the browser-only operation`);

            const linkId = String(link?.id ?? link?.link_id ?? '');
            const linkDetails = linkId ? await caldera.getOperationLink(operationId, linkId).catch(() => undefined) : undefined;

            log.info(`[caldera][browser] link status=${linkDetails?.status ?? link?.status} finish=${linkDetails?.finish ?? link?.finish}`);
            const output = linkDetails?.output ?? link?.output ?? '';
            if (output) {
                log.info(`[caldera][browser] output:\n${output}`);
            }

            // Success criteria: Caldera status 0 and finish set.
            const status = Number(linkDetails?.status ?? link?.status ?? 1);
            const finished = Boolean(linkDetails?.finish ?? link?.finish);
            if (status === 0 && finished) {
                log.info(`[caldera][browser] SUCCESS`);
                return;
            }

            log.warning(`[caldera][browser] FAILED (status=${status}, finished=${finished})`);
        } finally {
            // Restore group
            await caldera.updateAgent(targetAgent, { group: originalGroup }).catch(() => undefined);
            log.info(`[caldera][browser] restored agent group: ${runGroup} -> ${originalGroup}`);
        }

        await sleep(sleepMs);
    }

    throw new Error(`[caldera][browser] Exhausted attempts without success (attempts=${attempts})`);
};

export const cli = () => {
    run(runBrowserVisit, {
        description: `
Run ONLY the REF7707 "Browser visit" Caldera ability against a specific agent, retrying until it succeeds.
`,
        flags: {
            string: ['calderaUrl', 'calderaApiKey', 'group', 'targetAgent', 'domain', 'dnsIp', 'webIp', 'logLevel'],
            number: ['webPort', 'attempts', 'sleepMs', 'waitMs'],
            default: {
                calderaUrl: 'http://127.0.0.1:8888',
                group: 'ref7707',
                domain: '',
                dnsIp: '',
                webIp: '',
                webPort: DEFAULT_WEB_PORT,
                attempts: 25,
                sleepMs: 3000,
                waitMs: 180000,
            },
            help: `
  --calderaUrl     Caldera base URL
  --calderaApiKey  Caldera API key (KEY header)
  --targetAgent    Agent paw/hostname to target (required)
  --domain         Domain to visit (default: first REF7707 lab domain)
  --dnsIp          DNS VM ip for dig @dnsIp
  --webIp          Web VM ip for host-resolver-rules
  --attempts       Max attempts (default: 25)
  --sleepMs        Sleep between attempts (default: 3000)
  --waitMs         Per-attempt wait for link finish (default: 180000)
`,
        },
    });
};


