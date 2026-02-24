/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { startRuntimeServices, stopRuntimeServices, getRuntimeServices } from '../endpoint_agent_runner/runtime';
import { provisionRsa2026Demo, cleanupRsa2026Demo } from './provisioner';
import type { Rsa2026DemoConfig } from './types';
import type { ProvisioningStep } from './steps';

const runProvisioning: RunFn = async (cliContext) => {
    createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

    await startRuntimeServices({
        kibanaUrl: cliContext.flags.kibanaUrl as string,
        elasticUrl: cliContext.flags.elasticUrl as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
        apiKey: cliContext.flags.apiKey as string,
        spaceId: cliContext.flags.spaceId as string,
        version: cliContext.flags.version as string,
        log: cliContext.log,
    });

    const { kbnClient, esClient, log } = getRuntimeServices();

    const config: Partial<Rsa2026DemoConfig> = {
        defendOsqueryCount: cliContext.flags.defendOsqueryCount
            ? Number(cliContext.flags.defendOsqueryCount)
            : undefined,
        osqueryOnlyCount: cliContext.flags.osqueryOnlyCount
            ? Number(cliContext.flags.osqueryOnlyCount)
            : undefined,
        maliciousDomain: cliContext.flags.maliciousDomain as string,
        username: cliContext.flags.username as string,
        createDetectionRule: Boolean(cliContext.flags.createDetectionRule),
        createWorkflow: Boolean(cliContext.flags.createWorkflow),
        virustotalApiKey: cliContext.flags.virustotalApiKey as string,
        agentVersion: cliContext.flags.version as string,
        enableGui: Boolean(cliContext.flags.enableGui),
        vmGuiUser: cliContext.flags.vmGuiUser as string,
        vmGuiPassword: cliContext.flags.vmGuiPassword as string,
        vmType: (cliContext.flags.vmType as string) as Rsa2026DemoConfig['vmType'] || undefined,
        gcpVmNames: cliContext.flags.gcpVmNames as string || undefined,
    };

    try {
        log.info('Starting RSA 2026 demo provisioning...');
        // Avoid leaking secrets in logs
        const configForLogs = {
            ...config,
            virustotalApiKey: config.virustotalApiKey ? '<redacted>' : '',
            vmGuiPassword: config.vmGuiPassword ? '<redacted>' : '',
        };
        log.info(`Configuration: ${JSON.stringify(configForLogs, null, 2)}`);

        // Parse steps flag if provided (comma-separated list)
        const stepsFlag = cliContext.flags.steps as string | undefined;
        const steps = stepsFlag
            ? (stepsFlag.split(',').map((s) => s.trim()) as ProvisioningStep[])
            : undefined;

        const context = await provisionRsa2026Demo(kbnClient, esClient, log, config, steps);

        if (cliContext.flags.cleanup) {
            log.info('Cleanup flag set, cleaning up resources...');
            await cleanupRsa2026Demo(context, {
                cleanupAll: Boolean(cliContext.flags.cleanupAll),
            });
        } else {
            log.info('Provisioning completed. Resources are ready for demo.');
            log.info('Use --cleanup flag to remove all provisioned resources.');
        }
    } catch (error) {
        log.error('Error during provisioning:');
        log.error(error);
        if (error instanceof Error) {
            log.error(`Error message: ${error.message}`);
            log.error(`Stack trace: ${error.stack}`);
        }
        throw error;
    } finally {
        await stopRuntimeServices();
    }
};

export const cli = () => {
    run(runProvisioning, {
        description: `
  Provisions endpoints for RSA 2026 AI Forensics Agent demo:
  - Creates agent policies (Defend+Osquery and Osquery-only)
  - Provisions configurable number of endpoints
  - Sets up browser history (Chrome and Firefox) with malicious domain
  - Creates detection rule for malicious domain monitoring (REF7707)
  - Creates VirusTotal workflow for domain enrichment
  
  Default: 1 Defend+Osquery endpoint, 1 Osquery-only endpoint (for local development)
  Use --defend-osquery-count and --osquery-only-count to customize
`,
        flags: {
            string: [
                'kibanaUrl',
                'elasticUrl',
                'username',
                'password',
                'apiKey',
                'spaceId',
                'version',
                'defendOsqueryCount',
                'osqueryOnlyCount',
                'maliciousDomain',
                'virustotalApiKey',
                'vmGuiUser',
                'vmGuiPassword',
                'vmType',
                'gcpVmNames',
                'steps',
            ],
            boolean: ['cleanup', 'cleanupAll', 'createDetectionRule', 'createWorkflow', 'enableGui'],
            default: {
                kibanaUrl: 'http://127.0.0.1:5601',
                elasticUrl: 'http://127.0.0.1:9200',
                username: 'elastic',
                password: 'changeme',
                apiKey: '',
                spaceId: '',
                version: '',
                defendOsqueryCount: '1',
                osqueryOnlyCount: '1',
                maliciousDomain: 'digert.ictnsc.com',
                createDetectionRule: true,
                createWorkflow: true,
                enableGui: true,
                cleanup: false,
                cleanupAll: false,
                virustotalApiKey: '',
                vmGuiUser: 'ubuntu',
                vmGuiPassword: 'changeme',
            },
            help: `
        --defend-osquery-count    Number of endpoints with Elastic Defend + Osquery (default: 1)
        --osquery-only-count       Number of endpoints with Osquery only (default: 1)
        --malicious-domain         Malicious domain for browser history (default: digert.ictnsc.com)
        --virustotal-api-key       VirusTotal API key (required if --create-workflow is true)
        --create-detection-rule    Create detection rule for malicious domains (default: true)
        --create-workflow          Create VirusTotal workflow (default: true)
        --steps                    Comma-separated list of steps to run (default: all)
                                   Available steps: fleet-server, policies, endpoints, gui, browser-history, detection-rule, workflow
                                   Example: --steps=fleet-server,policies,endpoints
        --enableGui                Install XFCE + XRDP on Multipass VMs (default: true)
        --vmGuiUser                VM GUI user (default: ubuntu)
        --vmGuiPassword            VM GUI password (default: changeme)
        --vmType                   VM manager: multipass, vagrant, utm, or gcp (default: multipass, CI: vagrant)
        --gcpVmNames               Comma-separated GCP VM names for browser-history step (only for --vmType=gcp)
        --cleanup                  Clean up all provisioned resources after completion
        --cleanupAll               Also delete Kibana/Fleet artifacts created by the script (agent policies, rule, workflows, connectors)
        --version                  Agent version to use (default: stack version)
        --username                 Kibana username (default: elastic)
        --password                 Kibana password (default: changeme)
        --apiKey                   Kibana API key (alternative to username/password)
        --spaceId                  Space ID for provisioning (default: active space)
        --kibanaUrl                Kibana URL (default: http://127.0.0.1:5601)
        --elasticUrl               Elasticsearch URL (default: http://127.0.0.1:9200)
      `,
        },
    });
};

