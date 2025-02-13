/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMAND_AND_CONTROL,
  DISCOVERY,
  EXECUTION,
  EXFILTRATION,
  getTacticLabel,
  getTacticMetadata,
  INITIAL_ACCESS,
  LATERAL_MOVEMENT,
  PERSISTENCE,
  PRIVILEGE_ESCALATION,
  RECONNAISSANCE,
  replaceNewlineLiterals,
} from './helpers';
import { mockAttackDiscovery } from './pages/mock/mock_attack_discovery';
import * as i18n from './translations';

const expectedTactics = {
  [RECONNAISSANCE]: i18n.RECONNAISSANCE,
  [INITIAL_ACCESS]: i18n.INITIAL_ACCESS,
  [EXECUTION]: i18n.EXECUTION,
  [PERSISTENCE]: i18n.PERSISTENCE,
  [PRIVILEGE_ESCALATION]: i18n.PRIVILEGE_ESCALATION,
  [DISCOVERY]: i18n.DISCOVERY,
  [LATERAL_MOVEMENT]: i18n.LATERAL_MOVEMENT,
  [COMMAND_AND_CONTROL]: i18n.COMMAND_AND_CONTROL,
  [EXFILTRATION]: i18n.EXFILTRATION,
  unknown: 'unknown',
};

describe('helpers', () => {
  describe('getTacticLabel', () => {
    Object.entries(expectedTactics).forEach(([tactic, expectedLabel]) => {
      it(`returns the expected label for ${tactic}`, () => {
        const label = getTacticLabel(tactic);

        expect(label).toBe(expectedLabel);
      });
    });
  });

  describe('getTacticMetadata', () => {
    const expectedDetected = [
      'Initial Access',
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Credential Access',
    ];

    expectedDetected.forEach((tactic) => {
      it(`sets the detected property to true for the '${tactic}' tactic`, () => {
        const result = getTacticMetadata(mockAttackDiscovery);
        const metadata = result.find(({ name }) => name === tactic);

        expect(metadata?.detected).toBe(true);
      });
    });

    it('sets the detected property to false for all tactics that were not detected', () => {
      const result = getTacticMetadata(mockAttackDiscovery);
      const filtered = result.filter(({ name }) => !expectedDetected.includes(name));

      filtered.forEach((metadata) => {
        expect(metadata.detected).toBe(false);
      });
    });

    it('sets the expected "index" property for each tactic', () => {
      const result = getTacticMetadata(mockAttackDiscovery);

      result.forEach((metadata, i) => {
        expect(metadata.index).toBe(i);
      });
    });
  });

  describe('replaceNewlineLiterals', () => {
    it('replaces multiple newline literals with actual newlines', () => {
      const input = 'Multiple\\nnewline\\nliterals';
      const expected = 'Multiple\nnewline\nliterals';

      const result = replaceNewlineLiterals(input);

      expect(result).toEqual(expected);
    });

    it('does NOT replace anything if there are no newline literals', () => {
      const input = 'This is a string without newlines';
      const result = replaceNewlineLiterals(input);

      expect(result).toEqual(input);
    });
  });
});
