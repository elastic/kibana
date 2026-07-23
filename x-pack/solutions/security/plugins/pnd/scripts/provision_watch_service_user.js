#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Provision the least-privilege "pnd-watch-service" demo run-as identity.
 *
 * DECISION (locked): the demo Watch Orchestrator runs under a dedicated
 * least-privilege demo service user rather than the real platform
 * service-account/`run-as` primitive (tracked as an external dependency). This
 * script mints a scoped role + API key granting ONLY the privileges the Watch
 * chain needs:
 *   - read detection-engine alerts + endpoint telemetry (Enrich phase)
 *   - read/write the PND contract indices (pnd-investigations/proposals/
 *     evidence/worker-evaluations)
 *   - run managed workflows (workflow.execute of the Workers)
 * It grants NO cluster admin, NO response-action execution, NO write to
 * security alerts. Authorization is always re-asserted at the tool boundary;
 * `isAutomated:true` is never trusted (kibana#272111).
 *
 * Usage:
 *   node provision_watch_service_user.js \
 *     --es http://127.0.0.1:9180 --user elastic --pass changeme
 * Prints the API key (id + encoded) to stdout. Do NOT commit the key.
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const ES = args.es || process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9180';
const USER = args.user || 'elastic';
const PASS = args.pass || 'changeme';
const ROLE = 'pnd_watch_service';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const req = async (method, path, body) => {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
};

const roleDefinition = {
  cluster: ['manage_own_api_key'],
  indices: [
    {
      // Read-only: detection alerts + endpoint telemetry (Enrich phase).
      names: [
        '.alerts-security.alerts-*',
        '.internal.alerts-security.alerts-*',
        'logs-endpoint.events.*',
      ],
      privileges: ['read', 'view_index_metadata'],
    },
    {
      // Read/write: PND contract indices (the Watch chain's own data).
      names: ['pnd-investigations', 'pnd-proposals', 'pnd-evidence', 'pnd-worker-evaluations'],
      privileges: ['read', 'write', 'create_index', 'view_index_metadata'],
    },
  ],
  // NOTE: no run-as, no manage_security, no response-action privileges.
  applications: [],
};

(async () => {
  try {
    // 1. Create/refresh the scoped role.
    await req('PUT', `/_security/role/${ROLE}`, roleDefinition);
    // eslint-disable-next-line no-console
    console.log(`[ok] role '${ROLE}' created (least-privilege)`);

    // 2. Mint an API key restricted to that role.
    const key = await req('POST', '/_security/api_key', {
      name: 'pnd-watch-service-demo',
      role_descriptors: { [ROLE]: roleDefinition },
      metadata: { purpose: 'pnd-watch-orchestrator-run-as-demo', leastPrivilege: true },
    });
    // eslint-disable-next-line no-console
    console.log('[ok] API key minted for the demo Watch service identity:');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ id: key.id, encoded: key.encoded }, null, 2));
    // eslint-disable-next-line no-console
    console.log(
      '\nExport for the Orchestrator run-as identity (do NOT commit):\n' +
        `  export PND_WATCH_SERVICE_API_KEY="${key.encoded}"`
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[fail]', e.message);
    process.exit(1);
  }
})();
