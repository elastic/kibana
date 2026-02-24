/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { fetchAgentPolicyList } from '../common/fleet_services';
import {
  getRuntimeServices,
  startRuntimeServices,
  stopRuntimeServices,
} from '../endpoint_agent_runner/runtime';
import { addNetworkPacketCaptureDnsIntegrationToAgentPolicy } from './services/add_network_packet_capture_dns_integration';

const runEnableDns: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const kibanaUrl = flags.kibanaUrl as string;
  const elasticUrl = flags.elasticUrl as string;
  const username = (flags.username as string) || '';
  const password = (flags.password as string) || '';
  const apiKey = (flags.apiKey as string) || '';
  const spaceId = (flags.spaceId as string) || '';
  const policyName = (flags.policyName as string) || 'GCP VM agents';

  await startRuntimeServices({
    kibanaUrl,
    elasticUrl,
    fleetServerUrl: '', // not needed for policy edits
    username,
    password,
    apiKey,
    spaceId,
    includeOsquery: false,
    log,
  });

  const { kbnClient } = getRuntimeServices();
  try {
    const list = await fetchAgentPolicyList(kbnClient, { perPage: 1000 });
    const match = list.items?.find((p) => p.name === policyName);
    if (!match?.id) {
      const known = (list.items ?? [])
        .slice(0, 20)
        .map((p) => p.name)
        .join(', ');
      throw new Error(
        `Unable to find agent policy named [${policyName}]. Known policies (first 20): ${known}`
      );
    }

    log.info(`[ref7707] enabling DNS telemetry on agent policy: ${match.name} (${match.id})`);
    await addNetworkPacketCaptureDnsIntegrationToAgentPolicy({
      kbnClient,
      log,
      agentPolicyId: match.id,
    });
    log.info(`[ref7707] done. Wait ~30-90s for Elastic Agent(s) to receive policy updates.`);
    log.info(`[ref7707] search hint: dns.question.name:"poster.checkponit.lab"`);
  } finally {
    await stopRuntimeServices();
  }
};

export const cli = () => {
  run(runEnableDns, {
    description: `
Enable DNS telemetry (dns.question.name) on an existing Fleet agent policy by adding the Network Packet Capture integration (DNS-only).

This is typically needed for GCP-provisioned agents (run_gcp_fleet_vm) whose policy starts empty (no network capture).
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'policyName',
        'logLevel',
      ],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        spaceId: '',
        policyName: 'GCP VM agents',
      },
      help: `
  --kibanaUrl     Kibana URL (required)
  --elasticUrl    Elasticsearch URL (required)
  --username      Username (or use --apiKey)
  --password      Password
  --apiKey        Kibana API key (alternative to username/password)
  --spaceId       Optional Kibana space
  --policyName    Fleet agent policy name to modify (default: "GCP VM agents")
`,
    },
  });
};
