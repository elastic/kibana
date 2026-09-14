/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformLegacyMitreData } from './mitre_data_adapter';
import { MITRE_ATTACK_VERSION } from './mitre_version';
import { tacticOrder } from './mitre_tactics_order';

const EXPECTED_VERSION = MITRE_ATTACK_VERSION.startsWith('v')
  ? MITRE_ATTACK_VERSION.slice(1)
  : MITRE_ATTACK_VERSION;

describe('transformLegacyMitreData', () => {
  const baseTactics = [
    {
      id: 'TA0001',
      name: 'Initial Access',
      reference: 'https://attack.mitre.org/tactics/TA0001/',
      value: 'initialAccess',
      label: 'Initial Access (TA0001)',
    },
    {
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
      value: 'execution',
      label: 'Execution (TA0002)',
    },
    {
      id: 'TA0004',
      name: 'Privilege Escalation',
      reference: 'https://attack.mitre.org/tactics/TA0004/',
      value: 'privilegeEscalation',
      label: 'Privilege Escalation (TA0004)',
    },
    {
      id: 'TA0005',
      name: 'Defense Evasion',
      reference: 'https://attack.mitre.org/tactics/TA0005/',
      value: 'defenseEvasion',
      label: 'Defense Evasion (TA0005)',
    },
  ];

  describe('version normalization', () => {
    it('strips leading v from the version string', () => {
      const result = transformLegacyMitreData({
        tactics: [baseTactics[0]],
        techniques: [],
        subtechniques: [],
      });
      expect(result.tactics[0].framework_version).toBe(EXPECTED_VERSION);
      expect(result.tactics[0].framework_version).not.toMatch(/^v/);
    });
  });

  describe('tactic position ordering', () => {
    it('assigns positions matching tacticOrder indices', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [],
        subtechniques: [],
      });
      for (const tactic of result.tactics) {
        const expectedPosition = tacticOrder.indexOf(tactic.id);
        expect(tactic.position).toBe(expectedPosition);
      }
    });
  });

  describe('technique tactic_ids resolution', () => {
    it('resolves kebab-case tactic names to tactic ids', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
            value: 'commandAndScriptingInterpreter',
            label: 'Command and Scripting Interpreter (T1059)',
            tactics: ['execution'],
          },
        ],
        subtechniques: [],
      });
      expect(result.techniques[0].tactic_ids).toEqual(['TA0002']);
    });

    it('resolves multi-tactic technique correctly', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [
          {
            id: 'T1055',
            name: 'Process Injection',
            reference: 'https://attack.mitre.org/techniques/T1055/',
            value: 'processInjection',
            label: 'Process Injection (T1055)',
            tactics: ['defense-evasion', 'privilege-escalation'],
          },
        ],
        subtechniques: [],
      });
      expect(result.techniques[0].tactic_ids).toEqual(['TA0005', 'TA0004']);
    });

    it('drops unknown tactic names from tactic_ids rather than throwing', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [
          {
            id: 'T0001',
            name: 'Test Technique',
            reference: 'https://attack.mitre.org/techniques/T0001/',
            value: 'testTechnique',
            label: 'Test Technique (T0001)',
            tactics: ['execution', 'nonexistent-tactic'],
          },
        ],
        subtechniques: [],
      });
      // 'nonexistent-tactic' resolves to undefined and is dropped
      expect(result.techniques[0].tactic_ids).toEqual(['TA0002']);
    });
  });

  describe('subtechnique mapping', () => {
    it('maps techniqueId to technique_id', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [],
        subtechniques: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
            reference: 'https://attack.mitre.org/techniques/T1059/001/',
            value: 'powerShell',
            label: 'PowerShell (T1059.001)',
            tactics: ['execution'],
            techniqueId: 'T1059',
          },
        ],
      });
      expect(result.subtechniques[0].technique_id).toBe('T1059');
    });

    it('maps tactic_ids for subtechnique using kebab-case tactic names', () => {
      const result = transformLegacyMitreData({
        tactics: baseTactics,
        techniques: [],
        subtechniques: [
          {
            id: 'T1055.001',
            name: 'Dynamic-link Library Injection',
            reference: 'https://attack.mitre.org/techniques/T1055/001/',
            value: 'dynamicLinkLibraryInjection',
            label: 'Dynamic-link Library Injection (T1055.001)',
            tactics: ['defense-evasion', 'privilege-escalation'],
            techniqueId: 'T1055',
          },
        ],
      });
      expect(result.subtechniques[0].tactic_ids).toEqual(['TA0005', 'TA0004']);
    });
  });

  describe('static fields', () => {
    it('sets framework to enterprise on all entities', () => {
      const result = transformLegacyMitreData({
        tactics: [baseTactics[0]],
        techniques: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
            value: 'commandAndScriptingInterpreter',
            label: 'Command and Scripting Interpreter (T1059)',
            tactics: ['execution'],
          },
        ],
        subtechniques: [
          {
            id: 'T1059.001',
            name: 'PowerShell',
            reference: 'https://attack.mitre.org/techniques/T1059/001/',
            value: 'powerShell',
            label: 'PowerShell (T1059.001)',
            tactics: ['execution'],
            techniqueId: 'T1059',
          },
        ],
      });
      for (const tactic of result.tactics) {
        expect(tactic.framework).toBe('enterprise');
      }
      for (const technique of result.techniques) {
        expect(technique.framework).toBe('enterprise');
      }
      for (const subtechnique of result.subtechniques) {
        expect(subtechnique.framework).toBe('enterprise');
      }
    });

    it('sets revoked and deprecated to false on all entities', () => {
      const result = transformLegacyMitreData({
        tactics: [baseTactics[0]],
        techniques: [],
        subtechniques: [],
      });
      expect(result.tactics[0].revoked).toBe(false);
      expect(result.tactics[0].deprecated).toBe(false);
    });
  });

  describe('empty inputs', () => {
    it('returns empty buckets when given empty arrays', () => {
      const result = transformLegacyMitreData({ tactics: [], techniques: [], subtechniques: [] });
      expect(result.tactics).toEqual([]);
      expect(result.techniques).toEqual([]);
      expect(result.subtechniques).toEqual([]);
    });
  });
});
