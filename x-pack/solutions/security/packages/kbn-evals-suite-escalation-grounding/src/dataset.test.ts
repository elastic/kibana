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
import type { EscalationCase } from './types';

describe('escalation grounded-QA dataset', () => {
  it('has 15-25 cases', () => {
    expect(escalationCases.length).toBeGreaterThanOrEqual(15);
    expect(escalationCases.length).toBeLessThanOrEqual(25);
    expect(new Set(escalationCases.map((c) => c.id)).size).toBe(escalationCases.length);
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

  it('every investigation hosts at least one planted fact', () => {
    for (const c of escalationCases) {
      for (const index of c.investigations.keys()) {
        expect(c.plantedFacts.some((f) => f.investigation === index)).toBe(true);
      }
    }
  });

  it('every case asks at least one question answered by the last investigation', () => {
    for (const c of escalationCases) {
      const last = c.investigations.length - 1;
      const homes = c.questions.flatMap((q) =>
        q.factIds.map((id) => c.plantedFacts.find((f) => f.id === id)?.investigation)
      );
      expect(homes).toContain(last);
    }
  });

  describe('validateCases rejects', () => {
    const base = escalationCases[0];
    const problems = (c: EscalationCase) => validateCases([c]).map((i) => i.problem);

    it('a decoy investigation that hosts no fact', () => {
      const decoy: EscalationCase = {
        ...base,
        investigations: [
          base.investigations[0],
          { id: 'inv-decoy', title: 'decoy', events: [] },
          ...base.investigations.slice(1),
        ],
        plantedFacts: base.plantedFacts.map((f) =>
          f.investigation >= 1 ? { ...f, investigation: f.investigation + 1 } : f
        ),
      };
      expect(problems(decoy)).toContain('investigation inv-decoy hosts no planted fact');
    });

    it('a case with no question on the last investigation', () => {
      const last = base.investigations.length - 1;
      const lastFactIds = base.plantedFacts
        .filter((f) => f.investigation === last)
        .map((f) => f.id);
      const noLastQuestion: EscalationCase = {
        ...base,
        questions: base.questions.filter((q) => !q.factIds.some((id) => lastFactIds.includes(id))),
      };
      expect(problems(noLastQuestion)).toContain('no question on the last investigation');
    });
  });
});
