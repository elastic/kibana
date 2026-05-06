/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export const EntityStoreUtils = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  const enableV2Setting = async () => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': true } })
      .expect(200);
  };

  const disableV2Setting = async () => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': null } })
      .expect(200);
  };

  const install = async (entityTypes: string[] = ['user']) => {
    await enableV2Setting();

    const res = await supertest
      .post('/api/security/entity_store/install')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send({ entityTypes });

    if (res.status !== 200 && res.status !== 201) {
      log.error(`Failed to install entity store v2: ${JSON.stringify(res.body)}`);
    }
    expect([200, 201]).toContain(res.status);

    await retry.waitForWithTimeout('Entity store to be ready', 60_000, async () => {
      const statusRes = await supertest
        .get('/api/security/entity_store/status')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      const { status } = statusRes.body;
      if (status === 'error')
        throw new Error(`Entity store install failed: ${JSON.stringify(statusRes.body)}`);
      return status === 'running' || status === 'stopped';
    });

    return res;
  };

  const uninstall = async () => {
    await enableV2Setting();

    try {
      await supertest
        .post('/api/security/entity_store/uninstall')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '2023-10-31')
        .send({ entityTypes: ['user', 'host', 'service'] })
        .expect(200);
    } catch (e) {
      log.debug(`Entity store not installed, skipping uninstall: ${e.message}`);
    }

    await disableV2Setting();
  };

  const createEntity = async (entityType: string, body: Record<string, unknown>) => {
    const res = await supertest
      .post(`/api/security/entity_store/entities/${entityType}`)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .send(body);

    if (res.status !== 200) {
      log.error(
        `Failed to create ${entityType} entity: ${JSON.stringify(res.body)} (body: ${JSON.stringify(
          body
        )})`
      );
    }
    expect(res.status).toBe(200);
    return res;
  };

  return { install, uninstall, createEntity, enableV2Setting, disableV2Setting };
};
