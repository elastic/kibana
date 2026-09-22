/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import type { ScoutTestConfig } from '@kbn/scout-security';
import { createEsClientForTesting } from '@kbn/test-es-server';

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
};

/**
 * Returns an ES client that can create restricted indices such as `.fleet-agents`.
 * Scout's `elastic` superuser is denied `indices:admin/auto_create` on those indices.
 */
export const createSystemIndicesEsClient = async (
  esClient: Client,
  config: ScoutTestConfig
): Promise<Client> => {
  if (!config.serverless) {
    await esClient.security.putRole({
      name: SYSTEM_INDICES_SUPERUSER_ROLE,
      refresh: 'wait_for',
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
      applications: [{ application: '*', privileges: ['*'], resources: ['*'] }],
      run_as: ['*'],
    });

    await esClient.security.putUser({
      username: systemIndicesSuperuser.username,
      refresh: 'wait_for',
      password: systemIndicesSuperuser.password,
      roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
    });
  }

  return createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: systemIndicesSuperuser,
    isCloud: config.isCloud,
  });
};
