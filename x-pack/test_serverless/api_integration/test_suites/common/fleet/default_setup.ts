/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

const defaultFleetServerHostId = 'default-fleet-server';
const defaultFleetServerHostUrl = 'https://localhost:8220';
const defaultElasticsearchOutputId = 'es-default-output';
const defaultElasticsearchOutputHostUrl = 'https://localhost:9200';

export async function expectDefaultFleetServer({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  await retry.waitForWithTimeout('get default fleet server', 30_000, async () => {
    const { body, status } = await supertest.get(
      `/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`
    );
    if (status === 200 && body.item.host_urls.includes(defaultFleetServerHostUrl)) {
      return true;
    } else {
      throw new Error(`Expected default Fleet Server id ${defaultFleetServerHostId} to exist`);
    }
  });
}

export async function expectDefaultElasticsearchOutput({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  await retry.waitForWithTimeout('get default Elasticsearch output', 30_000, async () => {
    const { body, status } = await supertest.get(
      `/api/fleet/outputs/${defaultElasticsearchOutputId}`
    );
    if (status === 200 && body.item.hosts.includes(defaultElasticsearchOutputHostUrl)) {
      return true;
    } else {
      throw new Error(
        `Expected default Elasticsearch output id ${defaultElasticsearchOutputId} to exist`
      );
    }
  });
}

export const kbnServerArgs = [
  '--xpack.cloud.serverless.project_id=ftr_fake_project_id',
  `--xpack.fleet.fleetServerHosts=[${JSON.stringify({
    id: defaultFleetServerHostId,
    name: 'Default Fleet Server',
    is_default: true,
    host_urls: [defaultFleetServerHostUrl],
  })}]`,
  `--xpack.fleet.outputs=[${JSON.stringify({
    id: defaultElasticsearchOutputId,
    name: 'Default Output',
    type: 'elasticsearch',
    is_default: true,
    is_default_monitoring: true,
    hosts: [defaultElasticsearchOutputHostUrl],
  })}]`,
];
