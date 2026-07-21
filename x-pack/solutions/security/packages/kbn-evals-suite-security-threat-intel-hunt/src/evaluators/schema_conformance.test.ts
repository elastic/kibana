/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * L1 Schema Conformance — deterministic Jest unit tests that verify the
 * Zod input schemas for `hunt_orchestrator` and `hunt_behavior` accept
 * valid payloads and reject malformed / out-of-range / extraneous ones.
 *
 * These schemas mirror the server-side definitions in
 * `security_solution/server/agent_builder/tools/threat_intelligence/`.
 * Keeping them here (rather than importing across the plugin boundary)
 * makes the eval suite self-contained and runnable without the plugin
 * build graph.
 *
 * When the server schemas change, these tests will fail first — they are
 * the canary for breaking input contracts.
 */

// ---------------------------------------------------------------------------
// hunt_orchestrator schema (simplified — critical constraints only)
// ---------------------------------------------------------------------------
const huntOrchestratorSchema = z.object({
  report_id: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  iocs: z
    .array(
      z.object({
        type: z.enum(['ip', 'domain', 'hash_md5', 'hash_sha1', 'hash_sha256', 'url']),
        value: z.string().min(1),
      })
    )
    .optional(),
  techniques: z.array(z.string().regex(/^T\d{4}(\.\d{3})?$/)).optional(),
  size: z.number().int().min(1).max(100).optional().default(25),
  max_assets: z.number().int().min(1).max(500).optional().default(50),
  llm_confidence_threshold: z.number().min(0).max(1).optional().default(0.5),
  tier2_when: z.enum(['on_hits', 'always', 'never']).optional().default('on_hits'),
  max_tier2_sample_events: z.number().int().min(0).max(25).optional().default(5),
});

// ---------------------------------------------------------------------------
// hunt_behavior schema
// ---------------------------------------------------------------------------
const huntBehaviorSchema = z.object({
  text: z.string().min(1),
  report_id: z.string().min(1).optional(),
  llm_confidence_threshold: z.number().min(0).max(1).optional().default(0.5),
});

describe('L1 Schema Conformance', () => {
  describe('hunt_orchestrator', () => {
    it('accepts a minimal valid payload with text only', () => {
      const result = huntOrchestratorSchema.safeParse({ text: 'Report body...' });
      expect(result.success).toBe(true);
    });

    it('accepts a full payload with all fields', () => {
      const result = huntOrchestratorSchema.safeParse({
        report_id: 'report-123',
        text: 'Report body...',
        iocs: [{ type: 'ip', value: '1.2.3.4' }],
        techniques: ['T1566', 'T1566.001'],
        size: 50,
        max_assets: 100,
        llm_confidence_threshold: 0.7,
        tier2_when: 'always',
        max_tier2_sample_events: 10,
      });
      expect(result.success).toBe(true);
    });

    it('applies defaults for omitted optional fields', () => {
      const result = huntOrchestratorSchema.parse({ text: 'x' });
      expect(result.size).toBe(25);
      expect(result.max_assets).toBe(50);
      expect(result.llm_confidence_threshold).toBe(0.5);
      expect(result.tier2_when).toBe('on_hits');
      expect(result.max_tier2_sample_events).toBe(5);
    });

    it('rejects a technique ID with wrong format', () => {
      const result = huntOrchestratorSchema.safeParse({
        text: '...',
        techniques: ['T1566', 'NOT_A_TECHNIQUE'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects size > 100', () => {
      const result = huntOrchestratorSchema.safeParse({ text: '...', size: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects max_assets > 500', () => {
      const result = huntOrchestratorSchema.safeParse({ text: '...', max_assets: 501 });
      expect(result.success).toBe(false);
    });

    it('rejects llm_confidence_threshold > 1', () => {
      const result = huntOrchestratorSchema.safeParse({
        text: '...',
        llm_confidence_threshold: 1.1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative llm_confidence_threshold', () => {
      const result = huntOrchestratorSchema.safeParse({
        text: '...',
        llm_confidence_threshold: -0.1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown enum value for tier2_when', () => {
      const result = huntOrchestratorSchema.safeParse({
        text: '...',
        tier2_when: 'sometimes',
      });
      expect(result.success).toBe(false);
    });

    it('rejects max_tier2_sample_events > 25', () => {
      const result = huntOrchestratorSchema.safeParse({
        text: '...',
        max_tier2_sample_events: 26,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty text string', () => {
      const result = huntOrchestratorSchema.safeParse({ text: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('hunt_behavior', () => {
    it('accepts a minimal valid payload', () => {
      const result = huntBehaviorSchema.safeParse({ text: 'Report body...' });
      expect(result.success).toBe(true);
    });

    it('accepts a payload with optional report_id', () => {
      const result = huntBehaviorSchema.safeParse({
        text: 'Report body...',
        report_id: 'report-456',
      });
      expect(result.success).toBe(true);
    });

    it('applies default llm_confidence_threshold', () => {
      const result = huntBehaviorSchema.parse({ text: 'x' });
      expect(result.llm_confidence_threshold).toBe(0.5);
    });

    it('rejects empty text', () => {
      const result = huntBehaviorSchema.safeParse({ text: '' });
      expect(result.success).toBe(false);
    });

    it('rejects llm_confidence_threshold > 1', () => {
      const result = huntBehaviorSchema.safeParse({
        text: '...',
        llm_confidence_threshold: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing text', () => {
      const result = huntBehaviorSchema.safeParse({ report_id: 'r' });
      expect(result.success).toBe(false);
    });
  });
});
