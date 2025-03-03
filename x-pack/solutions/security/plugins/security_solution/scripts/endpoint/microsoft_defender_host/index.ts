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
import {
  DEFAULT_API_URL,
  DEFAULT_OAUTH_SCOPE,
  DEFAULT_OAUTH_SERVER_URL,
} from './services/constants';
import { createDetectionEngineMicrosoftDefenderRuleIfNeeded } from './services/create_detection_engine_microsoft_defend_rule';
import type { HostVm } from '../common/types';
import { onboardVmHostWithMicrosoftDefender } from './services/onboard_microsoft_vm';
import { createVm, generateVmName, getMultipassVmCountNotice } from '../common/vm_services';
import { createKbnClient } from '../common/stack_services';
import { ensureSpaceIdExists, fetchActiveSpace } from '../common/spaces';
import {
  addMicrosoftDefenderForEndpointIntegrationToAgentPolicy,
  DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME,
  enableFleetSpaceAwareness,
  enrollHostVmWithFleet,
  fetchAgentPolicy,
  getOrCreateDefaultAgentPolicy,
} from '../common/fleet_services';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  isFleetServerRunning,
  startFleetServer,
} from '../common/fleet_server/fleet_server_services';
import { createMicrosoftDefenderForEndpointConnectorIfNeeded } from './services/create_microsoft_defender_connector';

export const cli = async () => {
  return run(runCli, {
    description: `Sets up the kibana system so that Microsoft Defender for Endpoint hosts data can be be streamed to Elasticsearch.
It will first setup a host VM that runs the Microsoft Defender agent on it. This VM will ensure that data is being
created in Microsoft Defender's system.

It will then also setup a second VM (if necessary) that runs Elastic Agent along with the Microsoft Defender for Endpoint integration
policy (an agent-less integration) - this is the process that then connects to the Microsoft's management
console and pushes the data to Elasticsearch.`,
    flags: {
      string: [
        'clientId',
        'tenantId',
        'clientSecret',
        'oAuthServerUrl',
        'oAuthScope',
        'apiUrl,',
        'onboardingPackage',
        'kibanaUrl',
        'username',
        'password',
        'policy',
        'vmName',
        'spaceId',
        'apiKey',
        'version',
      ],
      boolean: ['forceFleetServer', 'forceNewHost'],
      default: {
        oAuthServerUrl: DEFAULT_OAUTH_SERVER_URL,
        oAuthScope: DEFAULT_OAUTH_SCOPE,
        apiUrl: DEFAULT_API_URL,
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        policy: '',
        spaceId: '',
        apiKey: '',
      },
      help: `
      --onboardingPackage Required. The local path to the Microsoft device onboarding package zip file. This file must be
                          downloaded from the Microsoft Defender management system under "Settings > Endpoints > Onboarding"
                          ( link: https://security.microsoft.com/securitysettings/endpoints/onboarding ). Select
                          "linux Server" for operating system, "Streamlined" for connectivity type and "Local Script (Python)"
                          for the deployment method.
      --tenantId          Required. The tenantId having access to Microsoft Defender for Endpoint management system.
      --clientId          Required. The azure application having privileges to access Microsoft Defender for Endpoint system
      --clientSecret      Required. The client secret created for the registered application's API access.
      --oAuthServerUrl:   Optional. The url for OAuth2 authorization. (Default: https://login.microsoftonline.com)
      --oAuthScope:       Optional. The OAuth2 scope for the authorization request and token retrieval.
                          (Default: https://securitycenter.onmicrosoft.com/windowsatpservice/.default)
      --apiUrl:           Optional. The URL for making API calls to Microsoft Defender for Endpoint management system.
                          (Default: https://api.securitycenter.windows.com)
      --vmName            Optional. The name for the VM.
                          Default: [current login user name]-msdefender-[unique number]
      --policy            Optional. The UUID of the Fleet Agent Policy that should be used to setup
                          the Microsoft Integration
                          Default: re-uses existing dev policy (if found) or creates a new one
      --forceFleetServer  Optional. If fleet server should be started/configured even if it seems
                          like it is already setup. (Default: false)
      --forceNewHost      Optional. Force a new VM host to be created and enrolled with Microsoft.
                          By default, a check is done to see if a host running Microsoft is
                          already running and if so, a new one will not be created - unless this
                          option is used (Default: false)
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
  const onboardingPackage = flags.onboardingPackage as string;
  const tenantId = flags.tenantId as string;
  const clientId = flags.clientId as string;
  const clientSecret = flags.clientSecret as string;
  const oAuthServerUrl = flags.oAuthServerUrl as string;
  const oAuthScope = flags.oAuthScope as string;
  const apiUrl = flags.apiUrl as string;
  const username = flags.username as string;
  const password = flags.password as string;
  const kibanaUrl = flags.kibanaUrl as string;
  const policy = flags.policy as string;
  const spaceId = flags.spaceId as string;
  const apiKey = flags.apiKey as string;
  const forceFleetServer = flags.forceFleetServer as boolean;
  const forceNewHost = flags.forceNewHost as boolean;
  const vmName = flags.vmName as string;
  const version = flags.version as string | undefined;

  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  ok(tenantId, getRequiredArgMessage('tenantId'));
  ok(clientId, getRequiredArgMessage('clientId'));
  ok(clientSecret, getRequiredArgMessage('clientSecret'));
  ok(oAuthServerUrl, getRequiredArgMessage('oAuthServerUrl'));
  ok(oAuthScope, getRequiredArgMessage('oAuthScope'));
  ok(apiUrl, getRequiredArgMessage('apiUrl'));
  ok(onboardingPackage, getRequiredArgMessage('onboardingPackage'));
  ok(
    fileExistsSync(onboardingPackage),
    `onboardingPackage file path does not exist! [${onboardingPackage}]`
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

  const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;

  const msVm = await onboardVmHostWithMicrosoftDefender({
    kbnClient,
    log,
    vmName,
    forceNewHost,
    onboardingPackage,
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

  await addMicrosoftDefenderForEndpointIntegrationToAgentPolicy({
    kbnClient,
    log,
    clientSecret,
    clientId,
    tenantId,
    agentPolicyId,
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
    createMicrosoftDefenderForEndpointConnectorIfNeeded({
      kbnClient,
      log,
      tenantId,
      clientId,
      clientSecret,
      oAuthServerUrl,
      oAuthScope,
      apiUrl,
    }),
    createDetectionEngineMicrosoftDefenderRuleIfNeeded(kbnClient, log, agentPolicyNamespace),
    // Trigger alert on the windows VM
    msVm.exec('curl -o /tmp/eicar.com.txt https://secure.eicar.org/eicar.com.txt').catch((err) => {
      log.warning(
        `Attempted to trigger an alert on host [${msVm.name}], but failed with: ${err.message}`
      );
    }),
  ]);

  log.info(`Done!

${msVm.info()}
${agentPolicyVm ? `${agentPolicyVm.info()}\n` : ''}
${await getMultipassVmCountNotice(2)}
`);
};
