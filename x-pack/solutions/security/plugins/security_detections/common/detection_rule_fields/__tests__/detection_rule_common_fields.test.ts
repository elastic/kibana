/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the plugin's copy of the detection rule common fields schema.
 *
 * This is the authoritative copy from step B.8 forward.  The note and setup
 * bounds are raised here relative to the shared package:
 *   - note: 65,536 (was 8,192)
 *   - setup: 16,384 (was 8,192)
 *
 * Ref: builder-type-registration-redesign.md "Long text fields and the string ceiling"
 */

import { z } from '@kbn/zod/v4';
import {
  detectionRuleCommonFields,
  threatTacticSchema,
  threatSubtechniqueSchema,
  threatTechniqueSchema,
  threatEntrySchema,
} from '../detection_rule_common_fields';

// Build a closed schema that replicates how each rule type uses the fragment.
const commonSchema = z.object(detectionRuleCommonFields).strict();

// ---------------------------------------------------------------------------
// Valid-example parse
// ---------------------------------------------------------------------------

describe('detectionRuleCommonFields – valid example', () => {
  const minimal = {
    severity: 'high' as const,
    risk_score: 73,
  };

  it('parses a minimal valid example (only required fields)', () => {
    const result = commonSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe('high');
      expect(result.data.risk_score).toBe(73);
    }
  });

  it('parses a fully-populated example with all optional fields', () => {
    const full = {
      severity: 'critical' as const,
      risk_score: 99,
      max_signals: 500,
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0002',
            name: 'Execution',
            reference: 'https://attack.mitre.org/tactics/TA0002/',
          },
          technique: [
            {
              id: 'T1059',
              name: 'Command and Scripting Interpreter',
              reference: 'https://attack.mitre.org/techniques/T1059/',
              subtechnique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001/',
                },
              ],
            },
          ],
        },
      ],
      setup: 'Install Sysmon.',
      note: 'Investigation notes.',
      references: ['https://example.org/writeup'],
      false_positives: ['Known-good process'],
      author: ['security-team'],
      license: 'Elastic License 2.0',
      related_integrations: [{ package: 'windows', version: '^1.0.0' }],
      required_fields: [{ name: 'process.args', type: 'keyword', ecs: true }],
    };

    const result = commonSchema.safeParse(full);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bound violations – each field's constraint
// ---------------------------------------------------------------------------

describe('detectionRuleCommonFields – bound violations', () => {
  const base = { severity: 'low' as const, risk_score: 0 };

  it('rejects an unknown severity value', () => {
    const result = commonSchema.safeParse({ ...base, severity: 'extreme' });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score below 0', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score above 100', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score that is not an integer', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: 7.5 });
    expect(result.success).toBe(false);
  });

  it('rejects max_signals below 1', () => {
    const result = commonSchema.safeParse({ ...base, max_signals: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects max_signals above 10000', () => {
    const result = commonSchema.safeParse({ ...base, max_signals: 10001 });
    expect(result.success).toBe(false);
  });

  it('rejects a threat array exceeding 5 entries', () => {
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://example.com/' },
    };
    const result = commonSchema.safeParse({ ...base, threat: Array(6).fill(entry) });
    expect(result.success).toBe(false);
  });

  it('rejects a threat technique array exceeding 5 entries', () => {
    const technique = {
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
    };
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      technique: Array(6).fill(technique),
    };
    const result = commonSchema.safeParse({ ...base, threat: [entry] });
    expect(result.success).toBe(false);
  });

  it('rejects a threat subtechnique array exceeding 3 entries', () => {
    const sub = { id: 'T1059.001', name: 'PS', reference: 'https://example.com/' };
    const technique = {
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
      subtechnique: Array(4).fill(sub),
    };
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      technique: [technique],
    };
    const result = commonSchema.safeParse({ ...base, threat: [entry] });
    expect(result.success).toBe(false);
  });

  // --- setup bounds (raised in this copy from 8,192 to 16,384) ---

  it('accepts a setup string of exactly 16,384 characters (new ceiling)', () => {
    const result = commonSchema.safeParse({ ...base, setup: 'x'.repeat(16384) });
    expect(result.success).toBe(true);
  });

  it('rejects a setup string of 16,385 characters (one above new ceiling)', () => {
    const result = commonSchema.safeParse({ ...base, setup: 'x'.repeat(16385) });
    expect(result.success).toBe(false);
  });

  // --- note bounds (raised in this copy from 8,192 to 65,536) ---

  it('accepts a note string of exactly 65,536 characters (new ceiling)', () => {
    const result = commonSchema.safeParse({ ...base, note: 'x'.repeat(65536) });
    expect(result.success).toBe(true);
  });

  it('rejects a note string of 65,537 characters (one above new ceiling)', () => {
    const result = commonSchema.safeParse({ ...base, note: 'x'.repeat(65537) });
    expect(result.success).toBe(false);
  });

  it('rejects a references array exceeding 32 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      references: Array(33).fill('https://example.org/'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a reference string exceeding 1024 characters', () => {
    const result = commonSchema.safeParse({ ...base, references: ['x'.repeat(1025)] });
    expect(result.success).toBe(false);
  });

  it('rejects a false_positives array exceeding 16 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      false_positives: Array(17).fill('known-good'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an author array exceeding 16 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      author: Array(17).fill('alice'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an author string exceeding 256 characters', () => {
    const result = commonSchema.safeParse({ ...base, author: ['x'.repeat(257)] });
    expect(result.success).toBe(false);
  });

  it('rejects a license string exceeding 256 characters', () => {
    const result = commonSchema.safeParse({ ...base, license: 'x'.repeat(257) });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations array exceeding 16 entries', () => {
    const entry = { package: 'windows', version: '^1.0.0' };
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: Array(17).fill(entry),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations package name exceeding 64 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: [{ package: 'x'.repeat(65), version: '^1.0.0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations version exceeding 32 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: [{ package: 'windows', version: 'x'.repeat(33) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields array exceeding 32 entries', () => {
    const field = { name: 'process.name', type: 'keyword', ecs: true };
    const result = commonSchema.safeParse({
      ...base,
      required_fields: Array(33).fill(field),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields name exceeding 128 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      required_fields: [{ name: 'x'.repeat(129), type: 'keyword', ecs: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields type exceeding 64 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      required_fields: [{ name: 'process.name', type: 'x'.repeat(65), ecs: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys at the top level (strict)', () => {
    const result = commonSchema.safeParse({ ...base, unknown_key: true });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatTacticSchema (strict)', () => {
    const result = threatTacticSchema.safeParse({
      id: 'TA0001',
      name: 'IA',
      reference: 'https://example.com/',
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatTechniqueSchema (strict)', () => {
    const result = threatTechniqueSchema.safeParse({
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatEntrySchema (strict)', () => {
    const result = threatEntrySchema.safeParse({
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exported sub-schemas parse correctly
// ---------------------------------------------------------------------------

describe('threatSubtechniqueSchema', () => {
  it('is the same shape as threatTacticSchema', () => {
    const data = { id: 'T1059.001', name: 'PowerShell', reference: 'https://example.com/' };
    expect(threatSubtechniqueSchema.safeParse(data).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Raised bounds — ensure the old bounds are not present in this copy
// ---------------------------------------------------------------------------

describe('detectionRuleCommonFields – raised bounds (B.8)', () => {
  const base = { severity: 'low' as const, risk_score: 0 };

  it('note accepts a string between 8,193 and 65,536 characters (old cap was 8,192)', () => {
    // A 29,075-character investigation guide already ships in the prebuilt corpus.
    // The old 8,192 cap would have rejected it.
    const result = commonSchema.safeParse({ ...base, note: 'x'.repeat(29075) });
    expect(result.success).toBe(true);
  });

  it('setup accepts a string between 8,193 and 16,384 characters (old cap was 8,192)', () => {
    const result = commonSchema.safeParse({ ...base, setup: 'x'.repeat(10000) });
    expect(result.success).toBe(true);
  });
});
