/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

const PUBLIC_API_HEADERS: ReadonlyArray<[string, string]> = [
  ['kbn-xsrf', 'true'],
  ['x-elastic-internal-origin', 'Kibana'],
  ['elastic-api-version', '2023-10-31'],
];

const withHeaders = <T extends { set: (key: string, value: string) => T }>(req: T): T =>
  PUBLIC_API_HEADERS.reduce((acc, [k, v]) => acc.set(k, v), req);

export const EntityStoreV2EnrichmentSetup = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');

  /**
   * Installs Entity Store v2 (host engine) and creates a host entity used by alert enrichment.
   *
   * Returns `true` if v2 was installed (e.g. in MKI where the feature flag is enabled by
   * default), or `false` if the `entityAnalyticsEntityStoreV2` experimental flag is disabled
   * (local CI configs pass `disable:entityAnalyticsEntityStoreV2`). When `false`, callers
   * should rely on the legacy risk/asset-criticality archive load for enrichment.
   */
  const setupHostEntity = async (hostEntity: Record<string, unknown>): Promise<boolean> => {
    await supertest
      .post('/internal/kibana/settings')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { [FF_ENABLE_ENTITY_STORE_V2]: true } });

    const installRes = await withHeaders(supertest.post('/api/security/entity_store/install')).send(
      { entityTypes: ['host'] }
    );

    if (installRes.status === 403) {
      log.info(
        'Entity store v2 is disabled in this Kibana; skipping v2 enrichment setup and falling back to legacy archive.'
      );
      return false;
    }
    if (installRes.status !== 200 && installRes.status !== 201) {
      throw new Error(
        `Entity store v2 install failed (status ${installRes.status}): ${JSON.stringify(
          installRes.body
        )}`
      );
    }

    await retry.waitForWithTimeout('entity store v2 to be ready', 60_000, async () => {
      const res = await withHeaders(supertest.get('/api/security/entity_store/status'));
      if (res.body.status === 'error') {
        throw new Error(`Entity store v2 install errored: ${JSON.stringify(res.body)}`);
      }
      return res.body.status === 'running' || res.body.status === 'stopped';
    });

    const createRes = await withHeaders(
      supertest.post('/api/security/entity_store/entities/host')
    ).send(hostEntity);
    if (createRes.status !== 200) {
      throw new Error(
        `Create host entity failed (status ${createRes.status}): ${JSON.stringify(createRes.body)}`
      );
    }

    return true;
  };

  const teardown = async (): Promise<void> => {
    try {
      await withHeaders(supertest.post('/api/security/entity_store/uninstall')).send({
        entityTypes: ['user', 'host', 'service'],
      });
    } catch (err) {
      log.debug(`Entity store v2 uninstall skipped: ${err instanceof Error ? err.message : err}`);
    }
  };

  return { setupHostEntity, teardown };
};
