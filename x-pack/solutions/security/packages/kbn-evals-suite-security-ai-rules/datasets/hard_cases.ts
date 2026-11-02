/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferenceRule } from './sample_rules';

export interface HardCase {
  id: string;
  prompt: string;
  output: ReferenceRule;
  metadata: { testType: string; difficulty: string };
}

/**
 * Hard / edge-case prompts for evaluating AI rule generation robustness.
 * Add new cases here and they will automatically be picked up by the eval suite.
 */
export const hardCases: HardCase[] = [
  // Placeholder expected output — not a useful benchmark until a real reference query is provided
  // {
  //   id: 'vague-suspicious-activity',
  //   prompt: 'Detect suspicious activity',
  //   output: {
  //     id: 'generic-suspicious-activity',
  //     name: 'Generic Suspicious Activity',
  //     description: 'Detects suspicious activity',
  //     query: 'FROM .alerts-security.* | WHERE event.kind == "signal" | LIMIT 100',
  //     threat: [],
  //     severity: 'low',
  //     tags: [],
  //     riskScore: 21,
  //     from: 'now-5m',
  //     category: 'unknown',
  //   },
  //   metadata: { testType: 'vague-prompt', difficulty: 'hard' },
  // },
  {
    id: 'complex-apt-zero-day',
    prompt:
      'Create a rule for detecting advanced persistent threat actors using zero-day exploits with polymorphic malware and anti-forensics techniques.\n\nAvailable data: logs-*',
    output: {
      id: 'complex-apt-detection',
      name: 'Complex APT Detection',
      prompt:
        'Create a rule for detecting advanced persistent threat actors using zero-day exploits with polymorphic malware and anti-forensics techniques.\n\nAvailable data: logs-*',
      description: 'Detects advanced persistent threats',
      query: 'FROM .alerts-security.* | WHERE event.kind == "signal" | LIMIT 100',
      threat: [],
      severity: 'critical',
      tags: [],
      riskScore: 99,
      from: 'now-5m',
      category: 'execution',
    },
    metadata: { testType: 'complex-prompt', difficulty: 'hard' },
  },
];
