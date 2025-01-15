/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as uuid from 'uuid';
import { ToolingLog } from '@kbn/tooling-log';
import { agentPolicyRouteService } from '@kbn/fleet-plugin/common/services';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import {
  AgentPolicy,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common';
import { KbnClient } from '@kbn/test';
import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { Agent as SuperTestAgent } from 'supertest';
import { FtrProviderContext } from '../api_integration/ftr_provider_context';

export function warnAndSkipTest(mochaContext: Mocha.Context, log: ToolingLog) {
  log.warning(
    'disabling tests because DockerServers service is not enabled, set FLEET_PACKAGE_REGISTRY_PORT to run them'
  );
  mochaContext.skip();
}

export function isDockerRegistryEnabledOrSkipped(providerContext: FtrProviderContext) {
  if (process.env.FLEET_SKIP_RUNNING_PACKAGE_REGISTRY === 'true') {
    return true;
  }

  const { getService } = providerContext;
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');

  return server.enabled;
}

export function skipIfNoDockerRegistry(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const dockerServers = getService('dockerServers');

  if (process.env.FLEET_SKIP_RUNNING_PACKAGE_REGISTRY === 'true') {
    return;
  }

  const server = dockerServers.get('registry');
  const log = getService('log');

  beforeEach(function beforeSetupWithDockerRegistry() {
    if (!server.enabled) {
      warnAndSkipTest(this, log);
    }
  });
}

export const makeSnapshotVersion = (version: string) => {
  return version.endsWith('-SNAPSHOT') ? version : `${version}-SNAPSHOT`;
};

export async function generateAgent(
  providerContext: FtrProviderContext,
  status: string,
  id: string,
  policyId: string,
  version?: string
) {
  let data: any = {};
  const { getService } = providerContext;
  const es = getService('es');

  switch (status) {
    case 'error':
      data = { policy_revision_idx: 1, last_checkin_status: 'error' };
      break;
    case 'degraded':
      data = { policy_revision_idx: 1, last_checkin_status: 'degraded' };
      break;
    case 'offline':
      // default inactivity timeout is 2 weeks
      // anything less + above offline timeout will be offline
      const oneWeekAgoTimestamp = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
      data = { policy_revision_idx: 1, last_checkin: new Date(oneWeekAgoTimestamp).toISOString() };
      break;
    case 'inactive':
      const threeWeeksAgoTimestamp = new Date().getTime() - 21 * 24 * 60 * 60 * 1000;
      data = {
        policy_revision_idx: 1,
        last_checkin: new Date(threeWeeksAgoTimestamp).toISOString(),
      };
      break;
    // Agent with last checkin status as error and currently unenrolling => should displayd updating status
    case 'error-unenrolling':
      data = {
        policy_revision_idx: 1,
        last_checkin_status: 'error',
        unenrollment_started_at: '2017-06-07T18:59:04.498Z',
      };
      break;
    default:
      data = { policy_revision_idx: 1, last_checkin: new Date().toISOString() };
  }

  await es.index({
    index: '.fleet-agents',
    id,
    body: {
      id,
      active: true,
      last_checkin: new Date().toISOString(),
      policy_id: policyId,
      policy_revision: 1,
      local_metadata: {
        elastic: {
          agent: {
            version,
            upgradeable: true,
          },
        },
      },
      ...data,
    },
    refresh: 'wait_for',
  });
}

export function setPrereleaseSetting(supertest: SuperTestAgent) {
  before(async () => {
    await supertest
      .put('/api/fleet/settings')
      .set('kbn-xsrf', 'xxxx')
      .send({ prerelease_integrations_enabled: true });
  });

  after(async () => {
    await supertest
      .put('/api/fleet/settings')
      .set('kbn-xsrf', 'xxxx')
      .send({ prerelease_integrations_enabled: false });
  });
}

export async function enableSecrets(providerContext: FtrProviderContext) {
  const settingsSO = await providerContext
    .getService('kibanaServer')
    .savedObjects.get({ type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE, id: 'fleet-default-settings' })
    .catch((err) => {});

  if (settingsSO) {
    await providerContext.getService('kibanaServer').savedObjects.update({
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      id: 'fleet-default-settings',
      attributes: {
        secret_storage_requirements_met: true,
      },
      overwrite: false,
    });
  } else {
    await providerContext.getService('kibanaServer').savedObjects.create({
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      id: 'fleet-default-settings',
      attributes: {
        secret_storage_requirements_met: true,
      },
      overwrite: true,
    });
  }
}

export const generateNAgentPolicies = async (
  supertest: SuperTestAgent,
  number: number,
  overwrite?: Partial<CreateAgentPolicyRequest['body']>
): Promise<AgentPolicy[]> => {
  const agentPolicyPromises: Array<Promise<AgentPolicy>> = [];

  for (let i = 0; i < number; i++) {
    agentPolicyPromises.push(generateAgentPolicy(supertest, overwrite));
  }

  const agentPolicies = await Promise.all(agentPolicyPromises);

  return agentPolicies;
};

export const generateAgentPolicy = async (
  supertest: SuperTestAgent,
  overwrite?: Partial<CreateAgentPolicyRequest['body']>
): Promise<AgentPolicy> => {
  const response = await supertest
    .post(agentPolicyRouteService.getCreatePath())
    .set('kbn-xsrf', 'xxxx')
    .send({ name: `Agent Policy ${uuid.v4()}`, namespace: 'default', ...overwrite })
    .expect(200);

  return (response.body as CreateAgentPolicyResponse).item;
};

export const addUninstallTokenToPolicy = async (
  kibanaServer: KbnClient,
  policyId: string,
  token: string
) => {
  const savedObject = await kibanaServer.savedObjects.create({
    type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    attributes: {
      policy_id: policyId,
      token,
    },
    overwrite: false,
  });

  return savedObject.id;
};
