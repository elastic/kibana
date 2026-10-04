/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCorroborationPrompt } from './prompt';
import { SCENARIOS } from './dataset';

describe('buildCorroborationPrompt', () => {
  const scenario = SCENARIOS.find((s) => s.id === 'no-raw-telemetry') ?? SCENARIOS[0];

  it('names the scenario narrative, hosts AND time window', () => {
    const prompt = buildCorroborationPrompt(scenario);

    expect(prompt).toContain(scenario.narrative);
    expect(prompt).toContain(scenario.scope.hosts.join(', '));
    // Regression: the hosts were the only scope given, so a model that queried
    // without a time bound answered the "no telemetry" scenario from a sibling
    // scenario's documents in the same indices.
    expect(prompt).toContain(scenario.scope.timeRange.from);
    expect(prompt).toContain(scenario.scope.timeRange.to);
    expect(prompt).toMatch(/bounded to the hosts and time range/i);
  });

  it('echoes the per-run identifier when one is supplied, and omits it otherwise', () => {
    const withRunId = buildCorroborationPrompt(scenario, { runId: 'raw-log-l4-abc123' });
    expect(withRunId).toContain('raw-log-l4-abc123');
    expect(withRunId).toMatch(/verbatim/);

    expect(buildCorroborationPrompt(scenario)).not.toMatch(/Run identifier/);
  });

  it('asks for persistence only when the caller needs a durable outcome', () => {
    expect(buildCorroborationPrompt(scenario)).not.toMatch(/investigation timeline/);
    expect(buildCorroborationPrompt(scenario, { requirePersistence: true })).toMatch(
      /investigation timeline/
    );
  });

  it('carries the two scope axes for every scenario in the dataset', () => {
    for (const s of SCENARIOS) {
      const prompt = buildCorroborationPrompt(s);
      expect(prompt).toContain(s.scope.timeRange.from);
      expect(prompt).toContain(s.scope.hosts[0]);
    }
  });
});
