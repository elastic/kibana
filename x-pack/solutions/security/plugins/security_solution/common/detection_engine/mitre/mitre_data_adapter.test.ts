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

    it('returns tactics sorted by position and leaves technique and subtechnique order untouched', () => {
      // Pass tactics in a non-position order: TA0043 (Reconnaissance) is position 0,
      // TA0001 (Initial Access) is position 2, TA0040 (Impact) is position 14.
      const tactics = [
        {
          id: 'TA0040',
          name: 'Impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
          value: 'impact',
          label: 'Impact (TA0040)',
        },
        {
          id: 'TA0043',
          name: 'Reconnaissance',
          reference: 'https://attack.mitre.org/tactics/TA0043/',
          value: 'reconnaissance',
          label: 'Reconnaissance (TA0043)',
        },
        {
          id: 'TA0001',
          name: 'Initial Access',
          reference: 'https://attack.mitre.org/tactics/TA0001/',
          value: 'initialAccess',
          label: 'Initial Access (TA0001)',
        },
      ];

      // Techniques are deliberately in non-alphabetical order to prove the adapter does not re-sort them.
      const techniques = [
        {
          id: 'T1595',
          name: 'Zeta Scan',
          reference: 'https://attack.mitre.org/techniques/T1595/',
          value: 'zetaScan',
          label: 'Zeta Scan (T1595)',
          tactics: ['reconnaissance'],
        },
        {
          id: 'T1190',
          name: 'Alpha Exploit',
          reference: 'https://attack.mitre.org/techniques/T1190/',
          value: 'alphaExploit',
          label: 'Alpha Exploit (T1190)',
          tactics: ['initial-access'],
        },
      ];

      // Subtechniques are deliberately in non-alphabetical order to prove the adapter does not re-sort them.
      const subtechniques = [
        {
          id: 'T1595.002',
          name: 'Zebra Subtechnique',
          reference: 'https://attack.mitre.org/techniques/T1595/002/',
          value: 'zebraSubtechnique',
          label: 'Zebra Subtechnique (T1595.002)',
          tactics: ['reconnaissance'],
          techniqueId: 'T1595',
        },
        {
          id: 'T1595.001',
          name: 'Apple Subtechnique',
          reference: 'https://attack.mitre.org/techniques/T1595/001/',
          value: 'appleSubtechnique',
          label: 'Apple Subtechnique (T1595.001)',
          tactics: ['reconnaissance'],
          techniqueId: 'T1595',
        },
      ];

      const result = transformLegacyMitreData({ tactics, techniques, subtechniques });

      // Tactics should come out in position order: TA0043 < TA0001 < TA0040
      expect(result.tactics.map((t) => t.id)).toEqual(['TA0043', 'TA0001', 'TA0040']);

      // Techniques should preserve input order: Zeta Scan, then Alpha Exploit
      expect(result.techniques.map((t) => t.name)).toEqual(['Zeta Scan', 'Alpha Exploit']);

      // Subtechniques should preserve input order: Zebra Subtechnique, then Apple Subtechnique
      expect(result.subtechniques.map((s) => s.name)).toEqual([
        'Zebra Subtechnique',
        'Apple Subtechnique',
      ]);
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
