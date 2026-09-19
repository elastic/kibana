/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

/**
 * Source-level guard for the L3 composite spec's proposal read.
 *
 * The finding this pins: the spec slept a fixed 5s and then read the proposals
 * ONCE. A nested Detection worker that persisted its proposal later than 5s
 * (slow model, loaded CI) produced an intermittent failure even though the
 * suite has a 15-minute budget. The fix is a bounded poll, which is a property
 * of the spec's source rather than of any function it calls — hence a guard
 * over the file.
 */

const COMPOSITE_SPEC = path.resolve(__dirname, '../evals/escalation_chain_composite.spec.ts');

describe('escalation_chain_composite.spec.ts waits for the downstream write', () => {
  const source = fs.readFileSync(COMPOSITE_SPEC, 'utf8');

  it('reads proposals through the bounded poller, not a single post-sleep read', () => {
    expect(source).toContain('pollUntil(');
    expect(source).not.toMatch(/setTimeout\(resolve,\s*5_000\)/);
  });

  it('polls for the expected Detection proposal specifically', () => {
    expect(source).toMatch(/until:\s*\([\s\S]{0,200}detection/);
  });

  it('bounds the wait with a deadline and a poll interval', () => {
    expect(source).toMatch(/timeoutMs:\s*\d+/);
    expect(source).toMatch(/intervalMs:\s*\d+/);
  });
});
