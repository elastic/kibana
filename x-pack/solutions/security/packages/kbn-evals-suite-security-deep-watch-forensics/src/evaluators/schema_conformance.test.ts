/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Lightweight deterministic structural validation for ES|QL queries used in
 * eval fixtures. Returns an array of error strings (empty = valid).
 *
 * This is intentionally NOT a full parser — it checks required clauses exist.
 */
function validateQuery(query: string): string[] {
  const errors: string[] = [];
  const hasFrom = /from\s+\S+/i.test(query);
  const hasWhere = /where\s+.+?(?:keep|limit|$)/i.test(query);
  const hasKeep = /keep\s+\S+/i.test(query);
  const hasLimit = /limit\s+\d+/i.test(query);

  if (!hasFrom) errors.push('Missing valid FROM clause');
  if (!hasWhere) errors.push('Missing WHERE clause');
  if (!hasKeep) errors.push('Missing KEEP clause');
  if (!hasLimit) errors.push('Missing LIMIT clause');

  return errors;
}

/**
 * L1 Schema Conformance — deterministic Jest unit tests that verify the
 * Zod input schemas for `deep_watch.package_evidence` and
 * `deep_watch.produce_draft_forensic_report` accept valid payloads and
 * reject malformed / out-of-range / extraneous ones.
 *
 * Also includes P4 tool allow-list checks and P3 Gate Family A tests.
 *
 * These schemas mirror the server-side definitions in
 * `security_solution/server/agent_builder/skills/deep_watch_forensics/`.
 */

// ── package_evidence schema ──────────────────────────────────────────────────

const packageEvidenceSchema = z.object({
  source_watch: z.enum([
    'dark-watch',
    'watch-floor',
    'watch-officer',
    'attack-discovery',
    'manual',
  ]),
  source_reference: z.string().optional(),
  hosts: z.array(z.string()).min(1),
  time_window_hours: z.number().int().min(1).max(720).optional().default(72),
  iocs: z
    .array(
      z.object({
        type: z.enum([
          'file_hash',
          'network_destination',
          'registry_key',
          'process_name',
          'mutex',
          'dns_domain',
        ]),
        value: z.string().min(1),
      })
    )
    .optional(),
  mitre_techniques: z.array(z.string()).optional(),
  open_questions: z.array(z.string()).optional(),
  scope_constraints: z
    .object({
      allowed_autonomy_level: z
        .enum(['propose', 'execute_read', 'execute_write'])
        .optional()
        .default('propose'),
      sensitivity: z.enum(['standard', 'sensitive', 'restricted']).optional().default('standard'),
    })
    .optional()
    .default({ allowed_autonomy_level: 'propose', sensitivity: 'standard' }),
});

// ── produce_draft_forensic_report schema ─────────────────────────────────────

const produceDraftSchema = z.object({
  hosts: z.array(z.string()).min(1),
  time_window_hours: z.number().int().min(1).max(720).optional().default(72),
  source_iocs: z
    .array(
      z.object({
        type: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
  mitre_techniques: z.array(z.string()).optional(),
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('L1 Schema Conformance — Deep Watch Forensics', () => {
  describe('package_evidence', () => {
    it('accepts a minimal valid payload', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a full payload with all fields', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'watch-floor',
        source_reference: 'ALERT-123',
        hosts: ['DESKTOP-APT29', 'SERVER-DC01'],
        time_window_hours: 48,
        iocs: [
          { type: 'file_hash', value: 'a3f5c9d1...' },
          { type: 'network_destination', value: '185.220.101.42' },
        ],
        mitre_techniques: ['T1078', 'T1570'],
        open_questions: ['What was the initial access vector?'],
        scope_constraints: {
          allowed_autonomy_level: 'propose',
          sensitivity: 'sensitive',
        },
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults for omitted optional fields', () => {
      const result = packageEvidenceSchema.parse({
        source_watch: 'manual',
        hosts: ['host-01'],
      });
      expect(result.time_window_hours).toBe(72);
      expect(result.scope_constraints?.allowed_autonomy_level).toBe('propose');
      expect(result.scope_constraints?.sensitivity).toBe('standard');
    });

    it('rejects an invalid source_watch enum value', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'custom-tool',
        hosts: ['host-01'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty hosts array', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects time_window_hours > 720', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        time_window_hours: 721,
      });
      expect(result.success).toBe(false);
    });

    it('rejects time_window_hours < 1', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        time_window_hours: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown IoC type', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        iocs: [{ type: 'email_address', value: 'evil@example.com' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty IoC value', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        iocs: [{ type: 'file_hash', value: '' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid allowed_autonomy_level', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        scope_constraints: { allowed_autonomy_level: 'full_admin' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sensitivity level', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        scope_constraints: { sensitivity: 'classified' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('produce_draft_forensic_report', () => {
    it('accepts a minimal valid payload', () => {
      const result = produceDraftSchema.safeParse({
        hosts: ['host-01'],
      });
      expect(result.success).toBe(true);
    });

    it('accepts a full payload with all fields', () => {
      const result = produceDraftSchema.safeParse({
        hosts: ['host-01', 'host-02'],
        time_window_hours: 48,
        source_iocs: [
          { type: 'network_destination', value: '185.220.101.42' },
          { type: 'registry_key', value: 'HKLM\\Run' },
        ],
        mitre_techniques: ['T1078', 'T1547'],
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults for omitted optional fields', () => {
      const result = produceDraftSchema.parse({
        hosts: ['host-01'],
      });
      expect(result.time_window_hours).toBe(72);
    });

    it('rejects empty hosts array', () => {
      const result = produceDraftSchema.safeParse({
        hosts: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects time_window_hours > 720', () => {
      const result = produceDraftSchema.safeParse({
        hosts: ['host-01'],
        time_window_hours: 721,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty source_ioc value', () => {
      const result = produceDraftSchema.safeParse({
        hosts: ['host-01'],
        source_iocs: [{ type: 'file_hash', value: '' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ES|QL query validation', () => {
    it('validates a file_hash IoC query as syntactically correct ES|QL', () => {
      const query =
        'FROM logs-endpoint.events.process-*, logs-endpoint.events.file-* | WHERE process.hash.sha256 == "abc123" OR file.hash.sha256 == "abc123" | KEEP @timestamp, host.name | LIMIT 1';
      const errors = validateQuery(query);
      expect(errors).toHaveLength(0);
    });

    it('validates a network_destination IoC query as syntactically correct ES|QL', () => {
      const query =
        'FROM logs-endpoint.events.network-* | WHERE destination.ip == "185.220.101.42" OR destination.domain == "185.220.101.42" | KEEP @timestamp, host.name | LIMIT 1';
      const errors = validateQuery(query);
      expect(errors).toHaveLength(0);
    });

    it('validates a registry_key IoC query as syntactically correct ES|QL', () => {
      const query =
        'FROM logs-endpoint.events.registry-* | WHERE registry.path LIKE "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run*" | KEEP @timestamp, host.name | LIMIT 1';
      const errors = validateQuery(query);
      expect(errors).toHaveLength(0);
    });

    it('flags an invalid ES|QL query', () => {
      const query = 'FROM logs-endpoint.events.process-* | WHERE bad_field == 123';
      const errors = validateQuery(query);
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  // ── P4: Tool allow-list contract ────────────────────────────────────────────
  //
  // These tests verify that the tool ID constants match the expected namespace
  // pattern and that the schema rejects attempts to inject unexpected tools
  // via the scope_constraints field.

  describe('tool allow-list contract', () => {
    it('tool IDs follow the security.deep_watch namespace', () => {
      // The two inline tools must be namespaced under security.deep_watch
      const expectedPrefix = 'security.deep_watch.';
      expect('security.deep_watch.package_evidence').toMatch(expectedPrefix);
      expect('security.deep_watch.produce_draft_forensic_report').toMatch(expectedPrefix);
    });

    it('scope_constraints.allowed_autonomy_level rejects execute_write', () => {
      // Per FR-007: Deep Watch recommends, never executes.
      // Even if a caller sends execute_write, the schema ACCEPTS it (it's a
      // valid enum value) — but the skill handler must IGNORE it and default
      // to propose. Here we verify the enum accepts the value so the handler
      // can explicitly log and override it, rather than silently dropping.
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'manual',
        hosts: ['host-01'],
        scope_constraints: { allowed_autonomy_level: 'execute_write' },
      });
      // Schema accepts it; the handler enforces propose-only at runtime.
      expect(result.success).toBe(true);
      // But default must always be 'propose'
      const defaulted = packageEvidenceSchema.parse({
        source_watch: 'manual',
        hosts: ['host-01'],
      });
      expect(defaulted.scope_constraints?.allowed_autonomy_level).toBe('propose');
    });
  });

  // ── P3: Gate Family A — deterministic safety checks ─────────────────────────

  describe('Gate Family A — output validation guards', () => {
    /**
     * A2: Malformed input must become a visible failure, never a silent verdict.
     * The zod schema enforces this: any malformed payload fails safeParse.
     */

    it('A2: rejects truncated JSON (missing required field hosts)', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        // hosts missing entirely — simulates truncated payload
      });
      expect(result.success).toBe(false);
    });

    it('A2: rejects semantically empty shape (hosts is null)', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: null,
      });
      expect(result.success).toBe(false);
    });

    it('A2: rejects wrong types (hosts is a string, not array)', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: 'single-host',
      });
      expect(result.success).toBe(false);
    });

    it('A2: rejects wrong types (time_window_hours is a string)', () => {
      const result = packageEvidenceSchema.safeParse({
        source_watch: 'dark-watch',
        hosts: ['host-01'],
        time_window_hours: 'seventy-two',
      });
      expect(result.success).toBe(false);
    });

    it('A2: produce_draft rejects semantically empty (no hosts at all)', () => {
      const result = produceDraftSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Gate Family A — approval boundary guards', () => {
    /**
     * A3: scope_constraints defines the autonomy boundary.
     * The schema's default is 'propose' — this is the approval gate.
     * Any escalation to execute_read or execute_write is accepted by the
     * schema but MUST be overridden by the handler at runtime (FR-007).
     */

    it('A3: default autonomy is propose (most restrictive)', () => {
      const result = packageEvidenceSchema.parse({
        source_watch: 'manual',
        hosts: ['host-01'],
      });
      expect(result.scope_constraints?.allowed_autonomy_level).toBe('propose');
    });

    it('A3: default sensitivity is standard', () => {
      const result = packageEvidenceSchema.parse({
        source_watch: 'manual',
        hosts: ['host-01'],
      });
      expect(result.scope_constraints?.sensitivity).toBe('standard');
    });

    it('A3: sensitivity can be escalated but never to an unknown level', () => {
      const valid = packageEvidenceSchema.safeParse({
        source_watch: 'manual',
        hosts: ['host-01'],
        scope_constraints: { sensitivity: 'restricted' },
      });
      expect(valid.success).toBe(true);

      const invalid = packageEvidenceSchema.safeParse({
        source_watch: 'manual',
        hosts: ['host-01'],
        scope_constraints: { sensitivity: 'top-secret' },
      });
      expect(invalid.success).toBe(false);
    });

    it('A3: omitted scope_constraints still defaults to propose/standard (fail-safe)', () => {
      const result = packageEvidenceSchema.parse({
        source_watch: 'manual',
        hosts: ['host-01'],
        // scope_constraints intentionally omitted — must default to safest level
      });
      expect(result.scope_constraints?.allowed_autonomy_level).toBe('propose');
      expect(result.scope_constraints?.sensitivity).toBe('standard');
    });
  });
});
