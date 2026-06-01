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
  host?: Record<string, unknown>;
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
 * Entity creation uses `refresh: 'wait_for'` internally, so seeded entities are
 * immediately searchable when `setup` returns. No additional refresh step is needed.
 *
 * Inspired by the approach started in https://github.com/elastic/kibana/pull/270939
 * by @denar50.
 */
export const EntityStoreV2EnrichmentSetup = (getService: FtrProviderContext['getService']) => {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');

  /**
   * Installs Entity Store V2 engines and seeds entities.
   *
   * Returns `false` when Entity Store V2 is not available in the current environment
   * (e.g. ESS / non-MKI stateful). Callers should call `this.skip()` when `false` is
   * returned so the test suite is skipped rather than failing.
   *
   * Returns `true` when setup completed successfully.
   */
  const setup = async (enrichmentConfig: EnrichmentSetupConfig): Promise<boolean> => {
    const entityTypes: string[] = [];
    if (enrichmentConfig.hosts?.length) entityTypes.push('host');
    if (enrichmentConfig.users?.length) entityTypes.push('user');

    if (entityTypes.length === 0) return true;

    const installRes = await withHeaders(supertest.post('/api/security/entity_store/install')).send(
      { entityTypes }
    );

    if (installRes.status !== 200 && installRes.status !== 201) {
      log.debug(
        `Entity Store V2 is not available in this environment (status ${installRes.status}), skipping`
      );
      return false;
    }

    // Wait until the initial entity store maintainer scan completes (`stopped`) before seeding
    // test entities. Seeding during a `running` scan risks having the engine overwrite the test
    // data before the detection rule runs. If the scan does not complete within the timeout the
    // environment is not suitable for enrichment tests, so we skip gracefully.
    const scanCompleted = await retry
      .waitForWithTimeout('Entity Store V2 initial scan to complete', 120_000, async () => {
        const res = await withHeaders(supertest.get('/api/security/entity_store/status'));
        if (res.body.status === 'error') {
          throw new Error(`Entity Store V2 install errored: ${JSON.stringify(res.body)}`);
        }
        return res.body.status === 'stopped';
      })
      .then(() => true)
      .catch((err: Error) => {
        log.debug(`Entity Store V2 scan did not complete in time, skipping: ${err.message}`);
        return false;
      });

    if (!scanCompleted) {
      return false;
    }

    for (const hostConfig of enrichmentConfig.hosts ?? []) {
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

    for (const userConfig of enrichmentConfig.users ?? []) {
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
    const res = await withHeaders(supertest.post('/api/security/entity_store/uninstall')).send({
      entityTypes: ['user', 'host', 'service'],
    });
    if (res.status !== 200) {
      log.debug(
        `Entity Store V2 uninstall returned non-200 (status ${res.status}): ${JSON.stringify(
          res.body
        )}`
      );
    }
  };

  return { setup, teardown };
};
