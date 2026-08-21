/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// L1 schema-conformance for the Watch escalation chain.
//
// The chain is driven by `workflow.execute` (no converse router surface), so a
// routing-smoke L0 is N/A here — there is no skill/tool the Agent Builder router
// could pick. The chain's deterministic entrypoint decision is covered separately
// by `transition_gate.test.ts` (the true L0 signal). What THIS file covers at L1
// is the CONTRACT of the escalation payload that threads Floor -> Dark -> Deep.
//
// This mirrors the canonical `watchEscalationSchema` owned by the pnd plugin
// (server/common/schemas/watch_escalation.ts). We re-declare it inline rather
// than importing across the plugin/package boundary — the same pattern the
// threat-intel-hunt suite uses for its own schema_conformance L1 — and assert
// that `buildSyntheticEscalation`, the fixture the L3/L4 specs drive the live
// chain with, actually conforms to that product contract. If the product shape
// drifts, this fails deterministically without booting Kibana.

import { z } from '@kbn/zod/v4';
import { buildSyntheticEscalation } from './constants';

const watchEscalationTierSchema = z.enum([
  'watch-floor',
  'watch-dark',
  'watch-deep',
  'watch-detection',
]);

const watchEscalationSchema = z.object({
  fromWatch: watchEscalationTierSchema,
  toWatch: watchEscalationTierSchema,
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  investigationId: z.string().min(1),
  indicators: z.array(z.string().min(1)).min(1),
});

describe('Watch escalation chain — L1 schema conformance', () => {
  it('buildSyntheticEscalation conforms to the canonical escalation contract', () => {
    const escalation = buildSyntheticEscalation('inv-eval-l1-conformance');
    expect(() => watchEscalationSchema.parse(escalation)).not.toThrow();
  });

  it('threads the exact investigationId it was given (bug #9 regression)', () => {
    const investigationId = 'inv-eval-thread-check';
    const escalation = buildSyntheticEscalation(investigationId);
    expect(watchEscalationSchema.parse(escalation).investigationId).toBe(investigationId);
  });

  it('carries at least one indicator and a non-empty reason', () => {
    const escalation = watchEscalationSchema.parse(buildSyntheticEscalation('inv-eval-indicators'));
    expect(escalation.indicators.length).toBeGreaterThanOrEqual(1);
    expect(escalation.reason.length).toBeGreaterThan(0);
  });

  it('escalates from Floor to Dark (the chain entrypoint hop)', () => {
    const escalation = watchEscalationSchema.parse(buildSyntheticEscalation('inv-eval-hop'));
    expect(escalation.fromWatch).toBe('watch-floor');
    expect(escalation.toWatch).toBe('watch-dark');
  });
});
