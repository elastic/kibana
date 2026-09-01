/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canary dataset: a deliberately unwinnable input, kept out of the golden dataset so its
 * intentional failures don't drag real-scenario aggregates.
 *
 * It is scored by the Canary Tripped evaluator with an inverted expectation: 1 means the
 * quality gate correctly penalized the vague input; 0 means everything sailed through —
 * the gate has stopped discriminating. Do not remove.
 */

import type { RuleCreationExample } from './golden';

export const canaryDataset: RuleCreationExample[] = [
  {
    id: 'canary-catch-all-query',
    input: {
      technique: 'T1059',
      gap_description: 'Any command execution activity',
      evidence: '',
      confidence: 0.1,
    },
    output: {
      mitreIds: ['T1059'],
      language: 'esql',
      esqlQuery: 'FROM * | LIMIT 1000', // catch-all reference — excluded from the seed-time guard
      isBrokenFixture: true,
    },
  },

  // A single canary is a single point of failure: one lucky draft flips the gate verdict.
  // Three more unwinnable shapes diversify what the gate must catch.
  {
    id: 'canary-empty-evidence',
    input: {
      technique: 'T1059',
      gap_description: 'Suspicious command execution somewhere in the fleet.',
      evidence: '',
      confidence: 0.2,
    },
    output: {
      mitreIds: ['T1059'],
      language: 'esql',
      esqlQuery: 'FROM * | LIMIT 1000',
      isBrokenFixture: true,
    },
  },
  {
    id: 'canary-contradictory-evidence',
    input: {
      technique: 'T1566',
      gap_description: 'Phishing emails delivering malware.',
      evidence: 'Mail gateway reports zero phishing detections this quarter; no complaints filed.',
      confidence: 0.15,
    },
    output: {
      mitreIds: ['T1566'],
      language: 'esql',
      esqlQuery: 'FROM * | LIMIT 1000',
      isBrokenFixture: true,
    },
  },
  {
    id: 'canary-nonexistent-technique',
    input: {
      technique: 'T9999',
      gap_description: 'Detection gap for an unregistered technique id.',
      evidence: 'Framework export lists no such technique.',
      confidence: 0.05,
    },
    output: {
      mitreIds: ['T9999'],
      language: 'esql',
      esqlQuery: 'FROM * | LIMIT 1000',
      isBrokenFixture: true,
    },
  },
];
