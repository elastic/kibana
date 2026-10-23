/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates or updates the roles of the Nightshift service accounts on a local stateful
 * Elasticsearch, where no predefined roles exist. Serverless defines its own `_`-prefixed roles.
 * Run from the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift_investigations/scripts/create_service_account_roles.ts
 *
 * Add --help to list the connection flags.
 */

import type { estypes } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import {
  ensureNightshiftServiceAccountRoles,
  NIGHTSHIFT_STATEFUL_SERVICE_ACCOUNT_ROLES,
} from '../common/service_account_roles';

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

run(
  async ({ log, flags }) => {
    const esUrl = String(flags['es-url']).replace(/\/$/, '');
    const auth = String(flags.auth);

    const putRole = async ({ name, ...role }: estypes.SecurityPutRoleRequest): Promise<void> => {
      const response = await fetch(`${esUrl}/_security/role/${name}`, {
        method: 'PUT',
        headers: { Authorization: basicAuth(auth), 'Content-Type': 'application/json' },
        body: JSON.stringify(role),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`PUT /_security/role/${name} -> ${response.status}: ${text.slice(0, 500)}`);
      }
    };

    await ensureNightshiftServiceAccountRoles({ security: { putRole } }, { isServerless: false });
    log.success(
      `Roles up to date: ${Object.keys(NIGHTSHIFT_STATEFUL_SERVICE_ACCOUNT_ROLES).join(', ')}`
    );
  },
  {
    description: 'Create the roles of the Nightshift service accounts on a local stateful cluster',
    flags: {
      string: ['es-url', 'auth'],
      default: {
        'es-url': 'http://localhost:9200',
        auth: 'elastic:changeme',
      },
      help: `
        --es-url  Elasticsearch URL (default: http://localhost:9200)
        --auth    Credentials of a user with manage_security (default: elastic:changeme)
      `,
    },
  }
);
