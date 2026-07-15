/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export const EntityStoreUtils = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  /**
   * UI settings are persisted via saved objects with refresh: false. Under load, a follow-up
   * API request can read Kibana config before Elasticsearch makes the write visible, so the
   * entity store middleware still sees V2 disabled (403). Wait until the setting is observable.
   */
  const waitUntilV2SettingVisible = async () => {
    await retry.waitForWithTimeout(
      `${FF_ENABLE_ENTITY_STORE_V2} visible in ui settings`,
      30_000,
      async () => {
        const res = await supertest
          .get('/internal/kibana/settings')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'Kibana')
          .expect(200);

        const userValue = res.body?.settings?.[FF_ENABLE_ENTITY_STORE_V2]?.userValue;
        if (userValue !== true) {
          throw new Error(
            `Expected ${FF_ENABLE_ENTITY_STORE_V2} userValue true, got ${JSON.stringify(userValue)}`
          );
        }
        return true;
      }
    );
  };

  const enableV2Setting = async () => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { [FF_ENABLE_ENTITY_STORE_V2]: true } })
      .expect(200);

    await waitUntilV2SettingVisible();
  };

  const disableV2Setting = async () => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { [FF_ENABLE_ENTITY_STORE_V2]: null } })
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

  const getEntityWatchlists = async (euid: string): Promise<string[]> => {
    const res = await supertest
      .get('/api/security/entity_store/entities')
      .query({ filter: `entity.id: "${euid}"`, size: 1 })
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .expect(200);

    const entity = res.body?.entities?.[0];
    const raw = entity?.entity?.attributes?.watchlists;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') return [raw];
    return [];
  };

  const clearAllEntityStoreData = async () => {
    await es
      .deleteByQuery(
        { index: '.entities.v2.latest.security_default*', query: { match_all: {} }, refresh: true },
        { ignore: [404] }
      )
      .catch((err) => {
        log.error(`Error clearing entity store data: ${err}`);
      });
  };

  return {
    install,
    uninstall,
    createEntity,
    clearAllEntityStoreData,
    getEntityWatchlists,
    enableV2Setting,
    disableV2Setting,
  };
};
