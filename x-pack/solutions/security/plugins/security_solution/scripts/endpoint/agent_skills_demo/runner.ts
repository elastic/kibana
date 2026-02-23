/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import path from 'path';
import execa from 'execa';
import { dump } from '../common/utils';
import { ensureSpaceIdExists } from '../common/spaces';
import { enableFleetSpaceAwareness, addEndpointIntegrationToAgentPolicy, getOrCreateDefaultAgentPolicy } from '../common/fleet_services';
import { fetchActiveSpace } from '../common/spaces';
import { generateVmName, createMultipassHostVmClient } from '../common/vm_services';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import { startFleetServerIfNecessary } from '../common/fleet_server/fleet_server_services';
import { addOsqueryIntegrationToAgentPolicy } from '../osquery_host/services/add_osquery_integration';
import { checkDependencies } from '../endpoint_agent_runner/pre_check';
import { startRuntimeServices, stopRuntimeServices, getRuntimeServices } from '../endpoint_agent_runner/runtime';
import { getScenario } from './scenarios';
import { waitForHostToEnroll } from '../common/fleet_services';

export interface RunAgentSkillsDemoOptions {
    kibanaUrl: string;
    elasticUrl: string;
    fleetServerUrl?: string;
    username: string;
    password: string;
    apiKey?: string;
    spaceId?: string;
    version?: string;
    policy?: string;
    scenario?: string;
    cleanup?: boolean;
    teardownVm?: string;
    runPlaywrightUi?: boolean;
    showBrowser?: boolean;
    multipassImage?: string;
    log?: ToolingLog;
}

export const runAgentSkillsDemo = async (options: RunAgentSkillsDemoOptions): Promise<void> => {
    if (options.teardownVm && options.teardownVm.length > 0) {
        await createMultipassHostVmClient(options.teardownVm).destroy();
        return;
    }

    await startRuntimeServices({
        kibanaUrl: options.kibanaUrl,
        elasticUrl: options.elasticUrl,
        fleetServerUrl: options.fleetServerUrl,
        username: options.username,
        password: options.password,
        apiKey: options.apiKey,
        spaceId: options.spaceId,
        version: options.version,
        policy: options.policy,
        includeOsquery: true,
        log: options.log,
    });

    const { kbnClient, log } = getRuntimeServices();
    let vmName: string | undefined;
    let agentPolicyId: string | undefined;

    try {
        if (options.spaceId && options.spaceId !== DEFAULT_SPACE_ID) {
            await enableFleetSpaceAwareness(kbnClient);
            await ensureSpaceIdExists(kbnClient, options.spaceId);
        }

        await checkDependencies();

        await startFleetServerIfNecessary({
            kbnClient,
            logger: log,
            version: options.version,
        });

        agentPolicyId =
            options.policy && options.policy.length > 0
                ? options.policy
                : (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;

        if (!agentPolicyId) {
            throw new Error(`Unable to determine agent policy id for the demo run`);
        }

        await addEndpointIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
        await addOsqueryIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });

        const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;
        vmName = generateVmName(`skills-demo-${activeSpaceId}`);

        const { options: runtimeOptions } = getRuntimeServices();

        if (!runtimeOptions.version) {
            throw new Error(`Unable to determine Agent version to enroll`);
        }

        log.info(`Creating VM and enrolling Elastic Agent (skills demo)`);
        log.indent(4);

        const { hostVm } = await createAndEnrollEndpointHost({
            kbnClient,
            log,
            hostname: vmName,
            agentPolicyId,
            version: runtimeOptions.version,
            useClosestVersionMatch: false,
            disk: '15G',
            multipassImage: options.multipassImage,
        });

        log.info(hostVm.info());
        log.indent(-4);

        const scenarioId = options.scenario?.length ? options.scenario : 'default';
        const scenario = getScenario(scenarioId);

        log.info(`Running scenario [${scenario.id}]: ${scenario.title}`);
        await scenario.run({ kbnClient, log, vmName, agentPolicyId });

        if (options.runPlaywrightUi) {
            if (!vmName) {
                throw new Error(`runPlaywrightUi requires a demo VM to be enrolled`);
            }

            const enrolledAgent = await waitForHostToEnroll(kbnClient, log, vmName, 120000);
            const uiScriptPath = path.resolve(
                __dirname,
                'ui',
                'agent_skills_demo_ui.mjs'
            );

            log.info(`Running Playwright UI demo flow`);

            await execa.command(`node ${uiScriptPath}`, {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    KIBANA_URL: options.kibanaUrl,
                    KIBANA_USERNAME: options.username,
                    KIBANA_PASSWORD: options.password,
                    KIBANA_SPACE_ID: options.spaceId ?? '',
                    DEMO_AGENT_ID: enrolledAgent.id,
                    DEMO_VM_NAME: vmName,
                    ...(options.showBrowser ? { SHOW: '1' } : {}),
                },
            });
        }

        if (options.cleanup && vmName) {
            log.info(`Cleaning up VM [${vmName}]`);
            await createMultipassHostVmClient(vmName, log).destroy();
        }
    } catch (e) {
        log.error(dump(e));

        if (options.cleanup && vmName) {
            try {
                log.warning(`Demo failed; attempting cleanup of VM [${vmName}]`);
                await createMultipassHostVmClient(vmName, log).destroy();
            } catch (cleanupError) {
                log.error(`Failed to cleanup VM [${vmName}] after error:\n${dump(cleanupError)}`);
            }
        }

        throw e;
    } finally {
        await stopRuntimeServices();
    }
};


