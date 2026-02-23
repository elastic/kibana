/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { runRef7707Lab } from './runner';

const runLab: RunFn = async (cliContext) => {
    createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

    await runRef7707Lab({
        kibanaUrl: cliContext.flags.kibanaUrl as string,
        elasticUrl: cliContext.flags.elasticUrl as string,
        fleetServerUrl: cliContext.flags.fleetServerUrl as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
        apiKey: cliContext.flags.apiKey as string,
        spaceId: cliContext.flags.spaceId as string,
        version: cliContext.flags.version as string,
        policy: cliContext.flags.policy as string,
        cleanup: Boolean(cliContext.flags.cleanup),
        teardownVm: cliContext.flags.teardownVm as string,
        multipassImage: cliContext.flags.multipassImage as string,
        vmPrefix: cliContext.flags.vmPrefix as string,
        orchestrator: cliContext.flags.orchestrator as 'local' | 'caldera',
        calderaUrl: cliContext.flags.calderaUrl as string,
        calderaApiKey: cliContext.flags.calderaApiKey as string,
        calderaWaitMs: cliContext.flags.calderaWaitMs as number,
        dnsTelemetrySource: cliContext.flags.dnsTelemetrySource as
            | 'network_packet_capture'
            | 'packetbeat'
            | 'defend'
            | 'none',
        allowMissingPacketbeat: Boolean(cliContext.flags.allowMissingPacketbeat),
        allowMissingNetworkPacketCapture: Boolean(cliContext.flags.allowMissingNetworkPacketCapture),
        log: cliContext.log,
    });
};

export const cli = () => {
    run(runLab, {
        description: `
  REF7707-like benign lab (Linux-only, Multipass):
  - ensures Elastic Defend + Osquery Manager + Packetbeat(DNS-only) integrations on the target policy
  - provisions 2 endpoint hosts (initiator + victim) with Elastic Agent
  - provisions 2 infra hosts (dns + web)
  - generates DNS -> HTTP download -> benign execution -> persistence-ish telemetry
  - default orchestrator: local runner (SSH lateral-ish step)
  - optional orchestrator: Caldera (deploy sandcat + run an operation)
`,
        flags: {
            string: [
                'kibanaUrl',
                'elasticUrl',
                'fleetServerUrl',
                'orchestrator',
                'calderaUrl',
                'calderaApiKey',
                'dnsTelemetrySource',
                'username',
                'password',
                'apiKey',
                'spaceId',
                'version',
                'policy',
                'teardownVm',
                'multipassImage',
                'vmPrefix',
            ],
            number: ['calderaWaitMs'],
            boolean: ['cleanup', 'allowMissingPacketbeat', 'allowMissingNetworkPacketCapture'],
            default: {
                kibanaUrl: 'http://127.0.0.1:5601',
                elasticUrl: 'http://127.0.0.1:9200',
                orchestrator: 'local',
                calderaUrl: '',
                calderaApiKey: '',
                calderaWaitMs: 10 * 60 * 1000,
                dnsTelemetrySource: 'network_packet_capture',
                allowMissingPacketbeat: false,
                allowMissingNetworkPacketCapture: false,
                username: 'elastic',
                password: 'changeme',
                apiKey: '',
                version: '',
                policy: '',
                spaceId: '',
                cleanup: false,
                teardownVm: '',
                multipassImage: 'lts',
                vmPrefix: '',
            },
            help: `
        --teardownVm         Optional. If provided, deletes this multipass VM and exits (no stack interaction).
        --cleanup            Optional. Cleanup created VMs after the lab run completes
        --orchestrator       Optional. 'local' (default) or 'caldera'
        --calderaUrl         Required when orchestrator=caldera. Example: http://127.0.0.1:8888 or http://<tailscale>:8888
        --calderaApiKey      Required when orchestrator=caldera. Caldera API key (header KEY)
        --calderaWaitMs      Optional. How long to wait for Caldera links (default: 10m)
        --dnsTelemetrySource Optional. network_packet_capture (default), packetbeat, defend, or none
        --allowMissingPacketbeat Optional. Continue even if Packetbeat package isn't available in the package registry (dns.question.name may be missing)
        --allowMissingNetworkPacketCapture Optional. Continue even if Network Packet Capture integration can't be installed/configured (dns.question.name may be missing)
        --version            Optional. The version of the Agent to enroll (default: stack version)
        --policy             Optional. Fleet Agent Policy ID to use (default: created/reused dev policy)
        --spaceId            Optional. Kibana space id to configure in
        --kibanaUrl          Optional. Kibana URL (Default: http://127.0.0.1:5601)
        --elasticUrl         Optional. Elasticsearch URL (Default: http://127.0.0.1:9200)
        --fleetServerUrl     Optional. Fleet Server URL (Default: managed by the script)
        --multipassImage     Optional. Multipass image alias/name (default: lts)
        --vmPrefix           Optional. A string to include in created VM names
      `,
        },
    });
};


