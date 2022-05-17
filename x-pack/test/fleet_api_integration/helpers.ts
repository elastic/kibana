/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context } from 'mocha';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../api_integration/ftr_provider_context';

export function warnAndSkipTest(mochaContext: Context, log: ToolingLog) {
  log.warning(
    'disabling tests because DockerServers service is not enabled, set FLEET_PACKAGE_REGISTRY_PORT to run them'
  );
  mochaContext.skip();
}

export function skipIfNoDockerRegistry(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const dockerServers = getService('dockerServers');

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
      data = { last_checkin_status: 'error' };
      break;
    case 'degraded':
      data = { last_checkin_status: 'degraded' };
      break;
    case 'offline':
      data = { last_checkin: '2017-06-07T18:59:04.498Z' };
      break;
    // Agent with last checkin status as error and currently unenrolling => should displayd updating status
    case 'error-unenrolling':
      data = {
        last_checkin_status: 'error',
        unenrollment_started_at: '2017-06-07T18:59:04.498Z',
      };
      break;
    default:
      data = { last_checkin: new Date().toISOString() };
  }

  await es.index({
    index: '.fleet-agents',
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
          },
        },
      },
      ...data,
    },
    refresh: 'wait_for',
  });
}
