/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { WORKER_ROLE_DEFINITIONS, getWorkerRoleName } from './worker_roles';

/**
 * Kibana's copies of the Serverless predefined worker roles, which elasticsearch-controller defines.
 * Regenerate them with `scripts/generate_worker_roles.js` after changing a role.
 */
const SERVERLESS_ROLE_MIRRORS = [
  'src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml',
  'x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/roles.yml',
];

const toFeaturePrivileges = (feature: Record<string, string[]>) =>
  Object.entries(feature).flatMap(([featureId, privileges]) =>
    privileges.map((privilege) => `feature_${featureId}.${privilege}`)
  );

const expectedServerlessRoles = Object.fromEntries(
  Object.values(WORKER_ROLE_DEFINITIONS).map(({ name, role }) => [
    getWorkerRoleName(name, { isServerless: true }),
    {
      description: expect.stringContaining('AlertZero'),
      metadata: { _public: true, _reserved: true },
      // The controller requires `read_project_routing` of every role that can read index data.
      cluster: [...role.elasticsearch.cluster, 'read_project_routing'],
      indices: role.elasticsearch.indices.map(({ names, privileges }) => ({
        names,
        privileges,
        allow_restricted_indices: false,
      })),
      applications: [
        {
          application: 'kibana-.kibana',
          privileges: toFeaturePrivileges(role.kibana[0].feature),
          resources: '*',
        },
      ],
    },
  ])
);

describe.each(SERVERLESS_ROLE_MIRRORS)('Serverless worker roles in %s', (mirror) => {
  const roles = parse(readFileSync(resolve(REPO_ROOT, mirror), 'utf8')) as Record<string, unknown>;
  const workerRoles = Object.fromEntries(
    Object.entries(roles).filter(([roleName]) => roleName.startsWith('_alertzero_'))
  );

  it('match WORKER_ROLE_DEFINITIONS', () => {
    expect(workerRoles).toEqual(expectedServerlessRoles);
  });
});
