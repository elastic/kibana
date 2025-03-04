/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ensureSpaceIdExists, fetchActiveSpace } from '../common/spaces';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import type { HostVm } from '../common/types';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  addSentinelOneIntegrationToAgentPolicy,
  DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME,
  enableFleetSpaceAwareness,
  enrollHostVmWithFleet,
  fetchAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import {
  createDetectionEngineSentinelOneRuleIfNeeded,
  createSentinelOneStackConnectorIfNeeded,
  installSentinelOneAgent,
  S1Client,
} from './common';
import {
  createMultipassHostVmClient,
  createVm,
  findVm,
  generateVmName,
  getMultipassVmCountNotice,
} from '../common/vm_services';
import { createKbnClient } from '../common/stack_services';

export const cli = async () => {
  // TODO:PT add support for CPU, Disk and Memory input args

  return run(runCli, {
    description: `Sets up the kibana system so that SentinelOne hosts data can be be streamed to Elasticsearch.
It will first setup a host VM that runs the SentinelOne agent on it. This VM will ensure that data is being
created in SentinelOne.
It will then also setup a second VM (if necessary) that runs Elastic Agent along with the SentinelOne integration
policy (an agent-less integration) - this is the process that then connects to the SentinelOne management
console and pushes the data to Elasticsearch.`,
    flags: {
      string: [
        'kibanaUrl',
        'username',
        'password',
        'version',
        'policy',
        's1Url',
        's1ApiToken',
        'vmName',
        'spaceId',
        'apiKey',
      ],
      boolean: ['forceFleetServer', 'forceNewS1Host'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        policy: '',
        spaceId: '',
        apiKey: '',
      },
      help: `
      --s1Url             Required. The base URL for SentinelOne management console.
                          Ex: https://usea1-partners.sentinelone.net (valid as of Oct. 2023)
      --s1ApiToken        Required. The API token for SentinelOne
      --vmName            Optional. The name for the VM.
                          Default: [current login user name]-sentinelone-[unique number]
      --policy            Optional. The UUID of the Fleet Agent Policy that should be used to setup
                          the SentinelOne Integration
                          Default: re-uses existing dev policy (if found) or creates a new one
      --forceFleetServer  Optional. If fleet server should be started/configured even if it seems
                          like it is already setup.
      --forceNewS1Host    Optional. Force a new VM host to be created and enrolled with SentinelOne.
                          By default, a check is done to see if a host running SentinelOne is
                          already running and if so, a new one will not be created - unless this
                          option is used
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
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const s1Url = flags.s1Url as string;
  const s1ApiToken = flags.s1ApiToken as string;
  const policy = flags.policy as string;
  const spaceId = flags.spaceId as string;
  const apiKey = flags.apiKey as string;
  const forceFleetServer = flags.forceFleetServer as boolean;
  const forceNewS1Host = flags.forceNewS1Host as boolean;
  const version = flags.version as string | undefined;
  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  ok(s1Url, getRequiredArgMessage('s1Url'));
  ok(s1ApiToken, getRequiredArgMessage('s1ApiToken'));

  const vmName = (flags.vmName as string) || generateVmName('sentinelone');
  const s1Client = new S1Client({ url: s1Url, apiToken: s1ApiToken, log });
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

  const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;

  const runningS1VMs = (
    await findVm(
      'multipass',
      flags.vmName ? vmName : new RegExp(`^${vmName.substring(0, vmName.lastIndexOf('-'))}`)
    )
  ).data;

  // Avoid enrolling another VM with SentinelOne if we already have one running
  const s1HostVm =
    forceNewS1Host || runningS1VMs.length === 0
      ? await createVm({
          type: 'multipass',
          name: vmName,
          log,
          memory: '2G',
          disk: '10G',
        }).then((vm) => {
          return installSentinelOneAgent({
            hostVm: vm,
            log,
            s1Client,
          }).then((s1Info) => {
            log.info(`SentinelOne Agent Status:\n${s1Info.status}`);

            return vm;
          });
        })
      : await Promise.resolve(createMultipassHostVmClient(runningS1VMs[0], log)).then((vm) => {
          log.info(
            `A host VM running SentinelOne Agent is already running - will reuse it.\nTIP: Use 'forceNewS1Host' to force the creation of a new one if desired`
          );

          return vm;
        });

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

  const { namespace: integrationPolicyNamespace } = await addSentinelOneIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId,
    consoleUrl: s1Url,
    apiToken: s1ApiToken,
  });

  let agentPolicyVm: HostVm | undefined;

  // If no agents are running against the given Agent policy for agentless integrations, then add one now
  if (!agents) {
    log.info(`Creating VM and enrolling it with Fleet using policy [${agentPolicyName}]`);

    agentPolicyVm = await createVm({
      type: 'multipass',
      name: generateVmName(`agentless-integrations-${activeSpaceId}`),
    });

    if (forceFleetServer || !(await isFleetServerRunning(kbnClient, log))) {
      await startFleetServer({
        kbnClient,
        logger: log,
        force: forceFleetServer,
        version,
      });
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
    createSentinelOneStackConnectorIfNeeded({ kbnClient, log, s1ApiToken, s1Url }),
    createDetectionEngineSentinelOneRuleIfNeeded(
      kbnClient,
      log,
      integrationPolicyNamespace || agentPolicyNamespace
    ),
  ]);

  // Trigger an alert on the SentinelOn host so that we get an alert back in Kibana
  log.info(`Triggering SentinelOne alert`);
  await s1HostVm
    .exec('curl -o /tmp/eicar.com.txt https://secure.eicar.org/eicar.com.txt')
    .catch((err) => {
      log.warning(
        `Attempted to trigger an alert on host [${s1HostVm.name}], but failed with: ${err.message}`
      );
    });

  log.info(`Done!

${s1HostVm.info()}
${agentPolicyVm ? `${agentPolicyVm.info()}\n` : ''}
${await getMultipassVmCountNotice(2)}
`);
};
