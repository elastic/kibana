/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import { escalationCases, validateCases } from './dataset';

describe('escalation grounded-QA dataset', () => {
  it('has 15-25 cases worth of questions', () => {
    const totalQuestions = escalationCases.reduce((sum, c) => sum + c.questions.length, 0);
    expect(escalationCases.length).toBeGreaterThanOrEqual(6);
    expect(totalQuestions).toBeGreaterThanOrEqual(15);
    expect(totalQuestions).toBeLessThanOrEqual(25);
  });

  it('every case links 2-5 investigations', () => {
    for (const c of escalationCases) {
      expect(c.investigations.length).toBeGreaterThanOrEqual(2);
      expect(c.investigations.length).toBeLessThanOrEqual(5);
    }
  });

  it('passes deterministic validation (facts present, questions single-homed)', () => {
    expect(validateCases(escalationCases)).toEqual([]);
  });

  it('every case plants a fact only in the last investigation', () => {
    for (const c of escalationCases) {
      const last = c.investigations.length - 1;
      const lastFacts = c.plantedFacts.filter((f) => f.investigation === last);
      expect(lastFacts.length).toBeGreaterThanOrEqual(1);
      // And that key appears in no other investigation.
      for (const fact of lastFacts) {
        for (const [index, inv] of c.investigations.entries()) {
          if (index !== last) {
            const haystack = inv.events.map((e) => Object.values(e.data).join(' ')).join(' ');
            expect(haystack).not.toContain(fact.key);
          }
        }
      }
    }
  });

  it('planted fact keys are unique per case', () => {
    for (const c of escalationCases) {
      const keys = c.plantedFacts.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
