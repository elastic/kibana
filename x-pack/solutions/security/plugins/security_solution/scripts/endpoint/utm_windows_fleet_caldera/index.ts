/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunFn } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import { userInfo } from 'os';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { createKbnClient } from '../common/stack_services';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createVm, generateVmName } from '../common/vm_services';
import {
  createAgentPolicy,
  enrollHostVmWithFleet,
  fetchAgentPolicyList,
} from '../common/fleet_services';
import { startFleetServerIfNecessary } from '../common/fleet_server/fleet_server_services';
import { deploySandcatToUtmWindowsVm } from '../ref7707_lab/services/deploy_sandcat_windows';

export const cli = async () => {
  return run(runCli, {
    description: `Creates a Windows VM in UTM, enrolls it into Fleet, and (optionally) deploys a Caldera sandcat agent.

Prerequisites (macOS):
- UTM installed (https://mac.getutm.app/) and utmctl available at /Applications/UTM.app/Contents/MacOS/utmctl
- A Windows VM template already created in UTM (used as the clone source)
- QEMU Guest Agent installed and running inside the Windows VM template (required for utmctl exec/file operations)

Usage examples:
- Enroll only:
  node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_utm_windows_fleet_caldera.js --templateVm "Win11 Template"

- Enroll + deploy sandcat:
  node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_utm_windows_fleet_caldera.js --templateVm "Win11 Template" --calderaUrl http://<caldera-host>:8888
`,
    flags: {
      string: [
        'kibanaUrl',
        'username',
        'password',
        'apiKey',
        'version',
        'vmName',
        'templateVm',
        'agentPolicyName',
        'calderaUrl',
        'calderaGroup',
      ],
      boolean: ['verbose'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        agentPolicyName: '',
        calderaUrl: '',
        calderaGroup: 'ref7707',
        verbose: false,
      },
      help: `
      --templateVm        Required. Name of an existing UTM Windows VM to clone (template)
      --vmName            Optional. Name for the new UTM VM (default: generated)
      --agentPolicyName   Optional. Fleet agent policy name to use/create (default: <user>-utm-windows)
      --calderaUrl        Optional. If provided, deploy Caldera sandcat agent and persist via Scheduled Task
      --calderaGroup      Optional. Caldera group for sandcat (default: ref7707)

      --kibanaUrl         Optional. Kibana URL (default: http://127.0.0.1:5601)
      --username          Optional. Kibana username (default: elastic)
      --password          Optional. Kibana password (default: changeme)
      --apiKey            Optional. Kibana API key (if set, username/password are ignored)
      --version           Optional. Elastic Agent version (default: match stack)
      --verbose           Optional. More logs
      `,
    },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const kibanaUrl = flags.kibanaUrl as string;
  const username = flags.username as string;
  const password = flags.password as string;
  const apiKey = flags.apiKey as string;
  const version = (flags.version as string) || undefined;
  const templateVm = flags.templateVm as string;
  const vmNameFlag = (flags.vmName as string) || '';
  const agentPolicyNameFlag = (flags.agentPolicyName as string) || '';
  const calderaUrl = (flags.calderaUrl as string) || '';
  const calderaGroup = (flags.calderaGroup as string) || 'ref7707';

  ok(Boolean(templateVm), '--templateVm is required');

  const kbnClient = createKbnClient({ log, url: kibanaUrl, username, password, apiKey });

  const systemUsername = userInfo().username.toLowerCase().replaceAll('.', '-');
  const policyName = agentPolicyNameFlag || `${systemUsername}-utm-windows`;
  const vmName = vmNameFlag || generateVmName('utm-windows', 'windows');

  log.info(`Starting UTM Windows VM + Fleet enrollment`);

  // Ensure Fleet Server is running (start in Docker if needed)
  await startFleetServerIfNecessary({
    kbnClient,
    logger: log,
    version,
    force: false,
  });

  // Get or create agent policy
  const existingPolicies = await fetchAgentPolicyList(kbnClient, {
    kuery: `ingest-agent-policies.name: "${policyName}"`,
    perPage: 1,
  });

  let policy: AgentPolicy;
  if (existingPolicies.items.length > 0) {
    policy = existingPolicies.items[0];
    log.info(`Using existing agent policy: ${policy.name} (${policy.id})`);
  } else {
    policy = await createAgentPolicy({
      kbnClient,
      policy: {
        name: policyName,
        description: `UTM Windows VM policy created by run_utm_windows_fleet_caldera`,
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
    });
    log.info(`Created agent policy: ${policy.name} (${policy.id})`);
  }

  // Create and enroll VM
  const vm = await createVm({
    type: 'utm',
    name: vmName,
    os: 'windows',
    templateVm,
    log,
  });

  await enrollHostVmWithFleet({
    hostVm: vm,
    kbnClient,
    log,
    agentPolicyId: policy.id,
    version,
    closestVersionMatch: true,
    // UTM doesn't support directory mounts; download inside VM instead
    useAgentCache: false,
    timeoutMs: 240000,
  });

  if (calderaUrl) {
    await deploySandcatToUtmWindowsVm({ hostVm: vm, calderaUrl, group: calderaGroup, log });
  } else {
    log.info(`Caldera deploy skipped (no --calderaUrl provided)`);
  }

  log.info(`Done.\n\n${vm.info()}`);
};
