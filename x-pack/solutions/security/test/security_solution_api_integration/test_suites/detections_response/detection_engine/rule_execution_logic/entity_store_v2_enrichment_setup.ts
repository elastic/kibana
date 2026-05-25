/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

const PUBLIC_API_HEADERS: ReadonlyArray<[string, string]> = [
  ['kbn-xsrf', 'true'],
  ['x-elastic-internal-origin', 'Kibana'],
  ['elastic-api-version', '2023-10-31'],
];

const withHeaders = <T extends { set: (key: string, value: string) => T }>(req: T): T =>
  PUBLIC_API_HEADERS.reduce((acc, [k, v]) => acc.set(k, v), req);

export interface HostEntityConfig {
  host: Record<string, unknown>;
  entity?: Record<string, unknown>;
  asset?: Record<string, unknown>;
}

export interface UserEntityConfig {
  user: Record<string, unknown>;
  entity?: Record<string, unknown>;
  asset?: Record<string, unknown>;
}

export interface EnrichmentSetupConfig {
  hosts?: HostEntityConfig[];
  users?: UserEntityConfig[];
}

/**
 * Installs Entity Store V2 engines and seeds entities for alert enrichment tests.
 *
 * On MKI, Entity Store V2 is always enabled — enrichment reads from the entity store
 * instead of legacy risk-score / asset-criticality indices. This helper installs the
 * store, seeds the required entities, and tears down afterward.
 *
 * Returns `true` if V2 was installed (MKI or local with V2 enabled), or `false` if the
 * experimental flag is disabled (local CI with `disable:entityAnalyticsEntityStoreV2`).
 * When `false`, callers should rely on the legacy esArchiver data for enrichment.
 *
 * Inspired by the approach started in https://github.com/elastic/kibana/pull/270939
 * by @denar50.
 */
export const EntityStoreV2EnrichmentSetup = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');

  const setup = async (config: EnrichmentSetupConfig): Promise<boolean> => {
    const entityTypes: string[] = [];
    if (config.hosts?.length) entityTypes.push('host');
    if (config.users?.length) entityTypes.push('user');

    if (entityTypes.length === 0) return false;

    const installRes = await withHeaders(supertest.post('/api/security/entity_store/install')).send(
      { entityTypes }
    );

    if (installRes.status >= 400 && installRes.status < 500) {
      // 403: feature disabled; 404: endpoint not registered (plugin disabled via flag)
      log.info(
        `Entity Store V2 not available (status ${installRes.status}); falling back to legacy archive.`
      );
      return false;
    }
    if (installRes.status !== 200 && installRes.status !== 201) {
      throw new Error(
        `Entity Store V2 install failed (status ${installRes.status}): ${JSON.stringify(
          installRes.body
        )}`
      );
    }

    await retry.waitForWithTimeout('Entity Store V2 to be ready', 60_000, async () => {
      const res = await withHeaders(supertest.get('/api/security/entity_store/status'));
      if (res.body.status === 'error') {
        throw new Error(`Entity Store V2 install errored: ${JSON.stringify(res.body)}`);
      }
      return res.body.status === 'running' || res.body.status === 'stopped';
    });

    for (const hostConfig of config.hosts ?? []) {
      const createRes = await withHeaders(
        supertest.post('/api/security/entity_store/entities/host')
      ).send(hostConfig);
      if (createRes.status !== 200) {
        throw new Error(
          `Create host entity failed (status ${createRes.status}): ${JSON.stringify(
            createRes.body
          )}`
        );
      }
    }

    for (const userConfig of config.users ?? []) {
      const createRes = await withHeaders(
        supertest.post('/api/security/entity_store/entities/user')
      ).send(userConfig);
      if (createRes.status !== 200) {
        throw new Error(
          `Create user entity failed (status ${createRes.status}): ${JSON.stringify(
            createRes.body
          )}`
        );
      }
    }

    return true;
  };

  const teardown = async (): Promise<void> => {
    try {
      await withHeaders(supertest.post('/api/security/entity_store/uninstall')).send({
        entityTypes: ['user', 'host', 'service'],
      });
    } catch (err) {
      log.debug(`Entity Store V2 uninstall skipped: ${err instanceof Error ? err.message : err}`);
    }
  };

  return { setup, teardown };
};
