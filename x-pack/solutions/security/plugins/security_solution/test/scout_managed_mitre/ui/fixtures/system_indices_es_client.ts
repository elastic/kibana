/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { EsClient, ScoutTestConfig } from '@kbn/scout-security';
import { SEEDED_MITRE_INDEX } from './mitre_fixtures';

const SEEDER_ROLE = 'mitre_fixture_seeder';
const SEEDER_USER = 'mitre_fixture_seeder';
const SEEDER_PASSWORD = 'mitre_fixture_seeder_password';

/** Strips any credentials embedded in the configured Elasticsearch URL. */
const getBaseEsUrl = (config: ScoutTestConfig): string => {
  const url = new URL(config.hosts.elasticsearch);
  url.username = '';
  url.password = '';
  return url.toString();
};

/**
 * Provisions a seeder user able to write to `.kibana_security_solution` and returns
 * a client authenticated as it.
 *
 * That index is a restricted (system) index: Elasticsearch refuses writes even for
 * `elastic` with the `superuser` role, which is what Scout's default `esClient`
 * authenticates as. Only a role declaring `allow_restricted_indices: true` is
 * accepted, and reserved users cannot be granted extra roles, so the role and a
 * user to carry it are created here.
 */
export const createSystemIndicesEsClient = async (
  esClient: EsClient,
  config: ScoutTestConfig
): Promise<Client> => {
  await esClient.security.putRole({
    name: SEEDER_ROLE,
    cluster: ['monitor'],
    indices: [
      {
        // Wildcard rather than the bare alias: delete_by_query authorizes its internal
        // bulk against the resolved concrete index (`.kibana_security_solution_<ver>_001`),
        // so granting only the alias name passes on write but fails on cleanup.
        names: [`${SEEDED_MITRE_INDEX}*`],
        privileges: ['all'],
        allow_restricted_indices: true,
      },
    ],
  });

  await esClient.security.putUser({
    username: SEEDER_USER,
    password: SEEDER_PASSWORD,
    roles: [SEEDER_ROLE],
  });

  const esUrl = getBaseEsUrl(config);

  return new Client({
    node: esUrl,
    auth: { username: SEEDER_USER, password: SEEDER_PASSWORD },
    ...(esUrl.startsWith('https') ? { tls: { rejectUnauthorized: false } } : {}),
  });
};

/** Removes the seeder user and role created by {@link createSystemIndicesEsClient}. */
export const deleteSystemIndicesEsUser = async (esClient: EsClient): Promise<void> => {
  // `ignore` is a transport option, not a request parameter.
  await esClient.security.deleteUser({ username: SEEDER_USER }, { ignore: [404] });
  await esClient.security.deleteRole({ name: SEEDER_ROLE }, { ignore: [404] });
};
