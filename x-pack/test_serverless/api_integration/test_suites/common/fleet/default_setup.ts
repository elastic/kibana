/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const defaultFleetServerHostId = 'default-fleet-server';
const defaultElasticsearchOutputId = 'es-default-output';

export async function expectDefaultFleetServer({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  let defaultFleetServerHostUrl: string = '';

  await retry.waitForWithTimeout('get default fleet server', 30_000, async () => {
    const { body, status } = await supertest.get(
      `/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`
    );
    if (status === 200 && body.item.host_urls.length > 0) {
      defaultFleetServerHostUrl = body.item.host_urls[0];
      return true;
    } else {
      throw new Error(`Expected default Fleet Server id ${defaultFleetServerHostId} to exist`);
    }
  });
  return defaultFleetServerHostUrl;
}

export async function expectDefaultElasticsearchOutput({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  let defaultEsOutputUrl: string = '';

  await retry.waitForWithTimeout('get default Elasticsearch output', 30_000, async () => {
    const { body, status } = await supertest.get(
      `/api/fleet/outputs/${defaultElasticsearchOutputId}`
    );
    if (status === 200 && body.item.hosts.length > 0) {
      defaultEsOutputUrl = body.item.hosts[0];
      return true;
    } else {
      throw new Error(
        `Expected default Elasticsearch output id ${defaultElasticsearchOutputId} to exist`
      );
    }
  });
  return defaultEsOutputUrl;
}

export const kbnServerArgs = [
  '--xpack.cloud.serverless.project_id=ftr_fake_project_id',
  `--xpack.fleet.fleetServerHosts=[${JSON.stringify({
    id: defaultFleetServerHostId,
    name: 'Default Fleet Server',
    is_default: true,
    host_urls: ['https://localhost:8220'],
  })}]`,
  `--xpack.fleet.outputs=[${JSON.stringify({
    id: defaultElasticsearchOutputId,
    name: 'Default Output',
    type: 'elasticsearch',
    is_default: true,
    is_default_monitoring: true,
    hosts: ['https://localhost:9200'],
  })}]`,
];
