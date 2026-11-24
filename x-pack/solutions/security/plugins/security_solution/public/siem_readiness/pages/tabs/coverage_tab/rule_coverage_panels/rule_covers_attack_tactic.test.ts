/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleCoversAttackTactic } from './rule_covers_attack_tactic';

const isInitialAccess = (name: string) => name === 'initial access';

describe('ruleCoversAttackTactic', () => {
  it('counts an ATT&CK rule with a matching tactic', () => {
    expect(
      ruleCoversAttackTactic(
        [{ framework: 'MITRE ATT&CK', tactic: { name: 'Initial Access' } }],
        isInitialAccess
      )
    ).toBe(true);
  });

  it('does not count an ATLAS-only rule whose tactic is named Initial Access', () => {
    expect(
      ruleCoversAttackTactic(
        [{ framework: 'MITRE ATLAS', tactic: { name: 'Initial Access' } }],
        isInitialAccess
      )
    ).toBe(false);
  });

  it('treats a missing framework as ATT&CK', () => {
    expect(ruleCoversAttackTactic([{ tactic: { name: 'Initial Access' } }], isInitialAccess)).toBe(
      true
    );
  });

  it('only matches the ATT&CK entry of a rule mixing ATLAS and ATT&CK', () => {
    const threats = [
      { framework: 'MITRE ATLAS', tactic: { name: 'Initial Access' } },
      { framework: 'MITRE ATT&CK', tactic: { name: 'Execution' } },
    ];
    expect(ruleCoversAttackTactic(threats, (name) => name === 'execution')).toBe(true);
    expect(ruleCoversAttackTactic(threats, isInitialAccess)).toBe(false);
  });

  it('returns false when there is no threat', () => {
    expect(ruleCoversAttackTactic(undefined, isInitialAccess)).toBe(false);
  });
});
