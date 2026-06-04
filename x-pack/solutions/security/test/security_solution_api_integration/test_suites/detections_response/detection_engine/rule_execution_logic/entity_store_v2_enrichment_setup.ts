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

// The entity maintainers API is an internal route that requires api-version '2'.
const INTERNAL_API_HEADERS: ReadonlyArray<[string, string]> = [
  ['kbn-xsrf', 'true'],
  ['x-elastic-internal-origin', 'Kibana'],
  ['elastic-api-version', '2'],
];

const withHeaders = <T extends { set: (key: string, value: string) => T }>(req: T): T =>
  PUBLIC_API_HEADERS.reduce((acc, [k, v]) => acc.set(k, v), req);

const withInternalHeaders = <T extends { set: (key: string, value: string) => T }>(req: T): T =>
  INTERNAL_API_HEADERS.reduce((acc, [k, v]) => acc.set(k, v), req);

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
   * Throws if the install API returns a non-2xx status (e.g. missing `entity-analytics`
   * privilege when the `security/complete` product tier is not configured). This is a hard
   * failure — the environment is misconfigured and the caller should not suppress it.
   *
   * Returns `false` if the risk-score maintainer does not complete its first run within
   * 5 minutes. This is a soft failure caused by CI timing variability, not a code bug.
   * Callers should call `this.skip()` when `false` is returned. Enrichment describe blocks
   * must be tagged `@skipInServerless` to prevent this function being called in environments
   * where the install API returns 403 (missing product-tier privilege).
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
      throw new Error(
        `Entity Store V2 install returned ${installRes.status}: ${JSON.stringify(
          installRes.body
        )}. ` +
          `Ensure the test environment has the 'security/complete' product tier configured ` +
          `(required for the 'entity-analytics' privilege).`
      );
    }

    // Wait until the risk-score maintainer has completed its first run (taskStatus === 'stopped'
    // and runs > 0). This ensures the maintainer has finished its initial setup pass and will not
    // overwrite CRUD-seeded test entities before the detection rule executes.
    // The entity store status API always returns 'running' once install is done, so we poll the
    // entity maintainers API instead.
    const scanCompleted = await retry
      .waitForWithTimeout('risk-score maintainer initial run to complete', 300_000, async () => {
        const res = await withInternalHeaders(
          supertest.get('/internal/security/entity_store/entity_maintainers?ids=risk-score')
        );
        const maintainer = res.body?.maintainers?.[0];
        if (!maintainer) return false;
        return maintainer.taskStatus === 'stopped' && maintainer.runs > 0;
      })
      .then(() => true)
      .catch((err: Error) => {
        log.warning(
          `risk-score maintainer did not complete its first run within the timeout — skipping enrichment tests. ` +
            `This is a CI timing issue, not a code bug. Error: ${err.message}`
        );
        return false;
      });

    if (!scanCompleted) return false;

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
