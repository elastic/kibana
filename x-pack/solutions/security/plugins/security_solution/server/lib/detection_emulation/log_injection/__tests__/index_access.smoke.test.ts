/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Smoke spec: Index Read-Access Discovery (Risk #16)
 *
 * Self-skips when EMULATION_SMOKE_ES_URL is not set.
 * When the env var is present, probes which built-in Elasticsearch roles have
 * read access to .kibana-security-emulation-logs-* and emits a structured JSON
 * findings object to stdout.
 *
 * This is a discovery probe, not an assertion spec. Operators should review the
 * output to decide which roles require explicit deny policies.
 *
 * The probe inspects role definitions (read-only) rather than creating temporary
 * users, so it works on any cluster regardless of write-quorum state.
 *
 * Usage:
 *   EMULATION_SMOKE_ES_URL=http://elastic:changeme@localhost:9200 \
 *     node scripts/jest server/lib/detection_emulation/log_injection/__tests__/index_access.smoke.test.ts
 */

import { Client } from '@elastic/elasticsearch';
import { EMULATION_LOGS_INDEX_PATTERN } from '../index_template';

const ES_URL = process.env.EMULATION_SMOKE_ES_URL;

// Built-in Elasticsearch roles that ship with every cluster.
const BUILT_IN_ROLES = [
  'superuser',
  'kibana_admin',
  'kibana_system',
  'monitoring_user',
  'viewer',
  'editor',
  'beats_system',
  'logstash_system',
  'fleet_server',
  'snapshot_user',
  'remote_monitoring_agent',
  'reporting_user',
] as const;

const serializeError = (err: unknown): string => {
  if (err instanceof Error) {
    const statusCode: number | undefined = (err as Error & { meta?: { statusCode?: number } }).meta
      ?.statusCode;
    return statusCode != null ? `${statusCode}: ${err.message}` : err.message;
  }
  return typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
};

interface AccessFinding {
  role: string;
  canRead: boolean;
  indexCount: number;
  write: boolean;
  createIndex: boolean;
  error?: string;
}

/**
 * Returns true if the ES index name pattern `rolePattern` (which may contain
 * * and ? wildcards) would match a concrete emulation log index name.  We test
 * against a representative concrete index rather than the wildcard pattern
 * itself because ES wildcard semantics only apply at query time.
 */
const exampleIndex = '.kibana-security-emulation-logs-default-2024.01.01';
const patternMatchesEmulationIndex = (rolePattern: string): boolean => {
  const reSource = rolePattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials except * and ?
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${reSource}$`).test(exampleIndex);
};

describe('index_access — built-in role discovery (smoke)', () => {
  if (!ES_URL) {
    it.skip('skipped — set EMULATION_SMOKE_ES_URL=<url> to enable', () => {});
    return;
  }

  let client: Client;

  beforeAll(() => {
    client = new Client({ node: ES_URL, requestTimeout: 10_000 });
  });

  afterAll(async () => {
    await client.close();
  });

  it('probes read access for built-in roles and emits structured findings', async () => {
    const ts = Date.now();
    const findings: AccessFinding[] = [];

    // Fetch actual index count once using the admin credentials so we can
    // populate indexCount for roles that the role-definition analysis says
    // have read access.
    let existingIndexCount = 0;
    try {
      const catResult = await client.cat.indices({
        index: EMULATION_LOGS_INDEX_PATTERN,
        format: 'json',
      });
      existingIndexCount = Array.isArray(catResult) ? catResult.length : 0;
    } catch {
      // Pattern resolves to nothing or access denied — 0 is correct.
    }

    for (const role of BUILT_IN_ROLES) {
      try {
        // Superuser is handled specially: it has unrestricted access by design.
        if (role === 'superuser') {
          findings.push({
            role,
            canRead: true,
            indexCount: existingIndexCount,
            write: true,

            createIndex: true,
          });
        } else {
          const result = await client.security.getRole({ name: role });
          const roleDef = result[role as string];

          if (!roleDef) {
            findings.push({
              role,
              canRead: false,
              indexCount: 0,
              write: false,

              createIndex: false,
              error: 'role definition not found in response',
            });
          } else {
            const indices = roleDef.indices ?? [];
            let canRead = false;
            let write = false;
            let createIndex = false;

            for (const grant of indices) {
              const names: string[] = Array.isArray(grant.names)
                ? (grant.names as string[])
                : [grant.names as unknown as string];
              const privs: string[] = Array.isArray(grant.privileges)
                ? (grant.privileges as string[])
                : [grant.privileges as unknown as string];

              if (names.some(patternMatchesEmulationIndex)) {
                if (privs.some((p) => p === 'read' || p === 'all' || p === 'indices:data/read/*'))
                  canRead = true;
                if (privs.some((p) => p === 'write' || p === 'all' || p === 'indices:data/write/*'))
                  write = true;
                if (privs.some((p) => p === 'create_index' || p === 'all' || p === 'manage'))
                  createIndex = true;
              }
            }

            findings.push({
              role,
              canRead,
              indexCount: canRead ? existingIndexCount : 0,
              write,

              createIndex,
            });
          }
        }
      } catch (err) {
        findings.push({
          role,
          canRead: false,
          indexCount: 0,
          write: false,

          createIndex: false,
          error: serializeError(err),
        });
      }
    }

    const output = {
      probe: 'index_access',
      method: 'role_definition_inspection',
      index_pattern: EMULATION_LOGS_INDEX_PATTERN,
      timestamp: new Date(ts).toISOString(),
      findings,
      summary: {
        can_read: findings.filter((f) => f.canRead).map((f) => f.role),
        cannot_read: findings.filter((f) => !f.canRead && !f.error).map((f) => f.role),
        errored: findings.filter((f) => Boolean(f.error)).map((f) => f.role),
      },
    };

    // Structured findings — operators use this to decide which roles need
    // explicit index-level deny rules.
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

    // Minimal guard: the probe must have run against at least one role.
    expect(findings.length).toBeGreaterThan(0);
  }, 60_000);
});
