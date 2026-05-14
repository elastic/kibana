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
 * Usage:
 *   EMULATION_SMOKE_ES_URL=https://elastic:changeme@localhost:9200 \
 *     node scripts/jest server/lib/detection_emulation/log_injection/__tests__/index_access.smoke.test.ts
 */

import { Client } from '@elastic/elasticsearch';
import type { TransportRequestOptions } from '@elastic/elasticsearch';
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

interface AccessFinding {
  role: string;
  canRead: boolean;
  indexCount: number;
  write: boolean;
  create_index: boolean;
  error?: string;
}

describe('index_access — built-in role discovery (smoke)', () => {
  if (!ES_URL) {
    it.skip('skipped — set EMULATION_SMOKE_ES_URL=<url> to enable', () => {});
    return;
  }

  let client: Client;
  const createdUsers: string[] = [];

  beforeAll(() => {
    client = new Client({ node: ES_URL });
  });

  afterAll(async () => {
    await Promise.allSettled(createdUsers.map((u) => client.security.deleteUser({ username: u })));
    await client.close();
  });

  it('probes read access for built-in roles and emits structured findings', async () => {
    const ts = Date.now();
    const findings: AccessFinding[] = [];

    for (const role of BUILT_IN_ROLES) {
      // Short unique username — ES max is 1024 chars, but keep it readable.
      const username = `_smk_de_${role.replace(/_/g, '')}${ts}`;
      const password = `SmokeP@ss${ts}!`;

      try {
        await client.security.putUser({ username, password, roles: [role] });
        createdUsers.push(username);

        // Use run_as header so we stay on a single connection pool but the
        // privilege check is evaluated as the role user, not the admin.
        const runAsOpts: TransportRequestOptions = {
          headers: { 'es-security-runas-user': username },
        };

        const result = await client.security.hasPrivileges(
          {
            index: [
              {
                names: [EMULATION_LOGS_INDEX_PATTERN],
                privileges: ['read', 'write', 'create_index'],
              },
            ],
          },
          runAsOpts
        );

        const idxPriv: Record<string, boolean> =
          (result.index as Record<string, Record<string, boolean>>)[EMULATION_LOGS_INDEX_PATTERN] ??
          {};

        const canRead = Boolean(idxPriv.read);

        // Count actual indices visible to this role — 0 when none exist yet or
        // access is denied. cat.indices returns an empty array on empty patterns
        // rather than throwing.
        let indexCount = 0;
        if (canRead) {
          try {
            const catResult = await client.cat.indices(
              { index: EMULATION_LOGS_INDEX_PATTERN, format: 'json' },
              runAsOpts
            );
            indexCount = Array.isArray(catResult) ? catResult.length : 0;
          } catch {
            // Access denied or pattern resolves to nothing — leave count at 0.
          }
        }

        findings.push({
          role,
          canRead,
          indexCount,
          write: Boolean(idxPriv.write),
          create_index: Boolean(idxPriv.create_index),
        });
      } catch (err) {
        findings.push({
          role,
          canRead: false,
          indexCount: 0,
          write: false,
          create_index: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const output = {
      probe: 'index_access',
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
  }, 120_000);
});
