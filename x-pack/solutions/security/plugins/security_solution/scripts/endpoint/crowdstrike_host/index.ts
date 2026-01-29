/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunFn } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import { existsSync as fileExistsSync } from 'fs';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { DEFAULT_API_URL } from './services/constants';
import { createDetectionEngineCrowdStrikeRuleIfNeeded } from './services/create_detection_engine_rule';
import { onboardVmHostWithCrowdStrike } from './services/install_crowdstrike_agent';
import {
  getMultipassVmCountNotice,
  createVm,
  generateVmName,
  findVm,
  createMultipassHostVmClient,
} from '../common/vm_services';
import { createKbnClient } from '../common/stack_services';
import { ensureSpaceIdExists, fetchActiveSpace } from '../common/spaces';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createCrowdStrikeConnectorIfNeeded } from './services/create_crowdstrike_connector';
import {
  addCrowdStrikeIntegrationToAgentPolicy,
  DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME,
  enableFleetSpaceAwareness,
  enrollHostVmWithFleet,
  fetchAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import type { HostVm } from '../common/types';

export const cli = async () => {
  return run(runCli, {
    description: `Sets up the kibana system so that CrowdStrike Falcon hosts data can be be streamed to Elasticsearch.
It will first setup a host VM that runs the CrowdStrike Falcon sensor on it. This VM will ensure that data is being
created in CrowdStrike's system.

It will then also setup a second VM (if necessary) that runs Elastic Agent along with the CrowdStrike integration
policy (an agent-less integration) - this is the process that then connects to the CrowdStrike Falcon API
and pushes the data to Elasticsearch.

Finally, it will also setup a CrowdStrike connector that connects to the CrowdStrike Falcon API and allows
for response actions to be performed on hosts.`,
    flags: {
      string: [
        'clientId',
        'clientSecret',
        'customerId',
        'apiUrl',
        'sensorInstaller',
        'kibanaUrl',
        'username',
        'password',
        'vmName',
        'spaceId',
        'apiKey',
        'version',
        'policy',
      ],
      boolean: ['forceFleetServer', 'forceNewCrowdStrikeHost', 'forceNewAgentlessHost'],
      default: {
        apiUrl: DEFAULT_API_URL,
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        spaceId: '',
        apiKey: '',
        policy: '',
      },
      help: `
      --sensorInstaller   Required. The local path to the CrowdStrike Falcon sensor installer package.
      --clientId          Required. The CrowdStrike Falcon API client ID with privileges to access the Falcon API.
      --clientSecret      Required. The client secret created for the registered application's API access.
      --customerId        Required. The CrowdStrike Customer ID (CID) used for sensor enrollment. This is different from
                          clientId and can be found in your CrowdStrike Falcon console under "Host Setup and Management".
      --apiUrl            Optional. The URL for making API calls to CrowdStrike Falcon management system.
                          Must match your CrowdStrike cloud region (e.g., https://api.us-2.crowdstrike.com for US-2,
                          https://api.eu-1.crowdstrike.com for EU-1, https://api.us-gov-1.crowdstrike.com for GovCloud).
                          (Default: https://api.crowdstrike.com)
      --vmName            Optional. The name for the VM.
                          Default: [current login user name]-crowdstrike-[unique number]
      --policy            Optional. The UUID of the Fleet Agent Policy that should be used to setup
                          the CrowdStrike Integration
                          Default: re-uses existing dev policy (if found) or creates a new one
      --forceFleetServer        Optional. If fleet server should be started/configured even if it seems
                                like it is already setup. (Default: false)
      --forceNewCrowdStrikeHost Optional. Force a new VM host to be created and enrolled with CrowdStrike.
                                By default, a check is done to see if a host running CrowdStrike is
                                already running and if so, a new one will not be created - unless this
                                option is used (Default: false)
      --forceNewAgentlessHost   Optional. Force a new agentless integrations VM to be created for Fleet.
                                By default, existing agentless VMs are reused - use this flag to create
                                a fresh VM if the existing one has issues (Default: false)
      --username          Optional. User name to be used for auth against elasticsearch and
                          kibana (Default: elastic).
      --password          Optional. Password associated with the username (Default: changeme)
      --apiKey            Optional. A Kibana API key to use for authz. When defined, 'username'
                          and 'password' arguments are ignored.
      --spaceId           Optional. The space id where the host should be added to in kibana. The
                          space will be created if it does not exist. Default: default space.
      --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
      --version           Optional. The version of the Agent to use for enrolling the new host.
                          Default: uses the same version as the stack (kibana). Version
                          can also be from 'SNAPSHOT'.
                          Examples: 8.6.0, 8.7.0-SNAPSHOT
`,
    },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  const sensorInstaller = flags.sensorInstaller as string;
  const clientId = flags.clientId as string;
  const clientSecret = flags.clientSecret as string;
  const customerId = flags.customerId as string;
  const apiUrl = flags.apiUrl as string;
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const spaceId = flags.spaceId as string;
  const apiKey = flags.apiKey as string;
  const forceNewCrowdStrikeHost = flags.forceNewCrowdStrikeHost as boolean;
  const forceNewAgentlessHost = flags.forceNewAgentlessHost as boolean;
  const forceFleetServer = flags.forceFleetServer as boolean;
  const policy = flags.policy as string;
  const version = flags.version as string | undefined;
  const vmName = flags.vmName as string;

  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  ok(sensorInstaller, getRequiredArgMessage('sensorInstaller'));
  ok(clientId, getRequiredArgMessage('clientId'));
  ok(clientSecret, getRequiredArgMessage('clientSecret'));
  ok(customerId, getRequiredArgMessage('customerId'));

  // Validate sensor installer file exists
  ok(
    fileExistsSync(sensorInstaller),
    `sensorInstaller file path does not exist! [${sensorInstaller}]`
  );

  const kbnClient = createKbnClient({
    log,
    url: kibanaUrl,
    username,
    password,
    spaceId,
    apiKey,
  });

  if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
    await ensureSpaceIdExists(kbnClient, spaceId, { log });
    await enableFleetSpaceAwareness(kbnClient);
  }

  const activeSpace = await fetchActiveSpace(kbnClient);
  const activeSpaceId = activeSpace.id;

  const crowdStrikeVm = await onboardVmHostWithCrowdStrike({
    kbnClient,
    log,
    vmName,
    forceNewCrowdStrikeHost,
    sensorInstaller,
    customerId,
  });

  // Get or create agent policy for CrowdStrike integration
  const {
    id: agentPolicyId,
    agents = 0,
    name: agentPolicyName,
    namespace: agentPolicyNamespace,
  } = policy
    ? await fetchAgentPolicy(kbnClient, policy)
    : await getOrCreateDefaultAgentPolicy({
        kbnClient,
        log,
        policyName: `${DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME} - ${activeSpaceId}`,
      });

  // Add CrowdStrike integration to agent policy
  const integrationPolicy = await addCrowdStrikeIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId,
    apiUrl,
    clientId,
    clientSecret,
  });

  let agentPolicyVm: HostVm | undefined;

  // If no agents are running against the given Agent policy for agentless integrations, then add one now
  if (!agents) {
    // Check for existing Fleet agent VMs before creating a new one
    const agentVmName = generateVmName(`agentless-integrations-${activeSpaceId}`);
    const existingAgentVms = await findVm(
      'multipass',
      new RegExp(`^${agentVmName.substring(0, agentVmName.lastIndexOf('-'))}`)
    );

    if (existingAgentVms.data.length > 0 && !forceNewAgentlessHost) {
      log.info(
        `A Fleet agent VM already exists - will reuse it: ${existingAgentVms.data[0]}.\nTIP: Use '--forceNewAgentlessHost' to force creation of a new one`
      );

      agentPolicyVm = await createMultipassHostVmClient(existingAgentVms.data[0], log);
    } else {
      if (forceNewAgentlessHost && existingAgentVms.data.length > 0) {
        log.info(`Forcing creation of new agentless VM (--forceNewAgentlessHost specified)`);
      }
      log.info(`Creating VM and enrolling it with Fleet using policy [${agentPolicyName}]`);

      agentPolicyVm = await createVm({
        type: 'multipass',
        name: agentVmName,
      });
    }

    if (forceFleetServer || !(await isFleetServerRunning(kbnClient, log))) {
      await startFleetServer({
        kbnClient,
        logger: log,
        force: forceFleetServer,
        version,
      });

      // Wait a moment for Fleet Server to be fully ready
      log.info('Waiting for Fleet Server to be fully operational...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    await enrollHostVmWithFleet({
      hostVm: agentPolicyVm,
      kbnClient,
      log,
      agentPolicyId,
      version,
    });
  } else {
    log.debug(
      `No host VM created for Fleet agent policy [${agentPolicyName}]. It already shows to have [${agents}] enrolled`
    );
  }

  await Promise.all([
    createCrowdStrikeConnectorIfNeeded({
      kbnClient,
      log,
      clientId,
      clientSecret,
      apiUrl,
    }),
    createDetectionEngineCrowdStrikeRuleIfNeeded(
      kbnClient,
      log,
      integrationPolicy.namespace || agentPolicyNamespace
    ),
  ]);

  // Trigger alerts on the Linux VM using realistic EDR test scenarios
  log.info('Triggering CrowdStrike test alerts on the host VM...');

  // CrowdStrike-specific test commands by severity level
  const crowdStrikeTestCommands = [
    // Informational level detections
    'bash crowdstrike_test_informational',

    // Low severity detections
    'bash crowdstrike_test_low',

    // Medium severity detections
    'bash crowdstrike_test_medium',

    // High severity detections
    'bash crowdstrike_test_high',

    // Critical severity detections
    'bash crowdstrike_test_critical',
  ];

  let successCount = 0;

  // Create an exec wrapper with detailed error reporting for debugging
  const debugExec = async (command: string) => {
    log.debug(`Executing command: ${command}`);
    try {
      const result = await crowdStrikeVm.exec(command, { silent: true });
      log.debug(`Command succeeded. stdout: ${result.stdout}, stderr: ${result.stderr}`);
      return result;
    } catch (err) {
      log.debug(`Command failed: ${command}`);
      log.debug(`Error details:`, err);
      throw err;
    }
  };

  log.info('Running CrowdStrike detection test commands...');
  let detectionCount = 0;

  for (const command of crowdStrikeTestCommands) {
    try {
      await debugExec(command);
      log.warning(`⚠️  CrowdStrike test command executed without blocking: ${command}`);
      log.warning(
        '   This may indicate CrowdStrike is not in prevention mode or the test script is not available'
      );
      successCount++;
    } catch (err) {
      detectionCount++;
      log.info(`🛡️  CrowdStrike detection triggered (command blocked): ${command}`);
      log.debug(`Block details:`, err);
    }
  }

  if (detectionCount > 0) {
    log.info(
      `🎉 CrowdStrike successfully detected ${detectionCount} out of ${crowdStrikeTestCommands.length} malicious test commands!`
    );
    log.info(
      '   This indicates CrowdStrike is actively protecting the host. Check CrowdStrike console for detection alerts.'
    );
  } else if (successCount > 0) {
    log.warning(
      `⚠️  All ${crowdStrikeTestCommands.length} CrowdStrike test commands executed without being blocked.`
    );
    log.warning('   This may indicate:');
    log.warning('   - CrowdStrike is in detection-only mode (not prevention)');
    log.warning('   - Test scripts are not available on the host');
    log.warning('   - CrowdStrike policies are not configured for these detections');
  } else {
    log.error(
      `❌ No CrowdStrike test commands could be executed - this indicates connectivity or environment issues`
    );
  }

  log.info(`Done!

${crowdStrikeVm.info()}
${agentPolicyVm ? `${agentPolicyVm.info()}\n` : ''}
${await getMultipassVmCountNotice(agentPolicyVm ? 2 : 1)}
`);
};
