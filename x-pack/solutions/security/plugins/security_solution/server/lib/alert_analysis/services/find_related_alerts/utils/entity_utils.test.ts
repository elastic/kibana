/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractSourceEntitiesFromAlert,
  getEntityFieldValues,
  RELATED_ALERT_SOURCE_ALLOWLIST,
  RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS,
  trimEntityValues,
  truncateRelatedAlertLongFields,
} from './entity_utils';
import { RELATED_ALERT_ENTITY_LIST_MAX_LENGTH } from '../../../../../../common/api/alert_analysis/related_alerts';

describe('entity_utils', () => {
  it('reads nested ECS host.name values', () => {
    const entities = extractSourceEntitiesFromAlert({
      host: { name: 'nested-host' },
    });

    expect(entities.hostNames).toEqual(['nested-host']);
  });

  it('reads dotted ECS field names when present on the document', () => {
    expect(getEntityFieldValues({ 'host.name': 'flat-host' }, 'host.name')).toEqual(['flat-host']);
  });

  it('caps merged entity values at RELATED_ALERT_ENTITY_LIST_MAX_LENGTH', () => {
    const values = Array.from({ length: RELATED_ALERT_ENTITY_LIST_MAX_LENGTH + 5 }, (_, i) =>
      String(i)
    );

    expect(trimEntityValues(values)).toHaveLength(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH);
  });

  describe('related alert source allowlist', () => {
    it('includes command lines and rule description so models can judge what actually ran', () => {
      expect(RELATED_ALERT_SOURCE_ALLOWLIST).toEqual(
        expect.arrayContaining([
          'process.command_line',
          'process.parent.command_line',
          'kibana.alert.rule.description',
        ])
      );
    });
  });

  describe('truncateRelatedAlertLongFields', () => {
    const commandLineMax = RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS['process.command_line'];
    const longValue = 'a'.repeat(commandLineMax + 100);

    const suffix = '… [truncated]';
    const truncated = (max: number) => 'a'.repeat(max) + suffix;

    it('truncates long nested command lines to exactly max + suffix and keeps other fields', () => {
      const source = {
        'host.name': 'h1',
        process: { command_line: longValue, parent: { command_line: '/usr/sbin/sshd -D' } },
      };
      const result = truncateRelatedAlertLongFields(source) as {
        process: { command_line: string; parent: { command_line: string } };
      };

      expect(result.process.command_line).toBe(truncated(commandLineMax));
      expect(result.process.command_line).toHaveLength(commandLineMax + suffix.length);
      expect(result.process.parent.command_line).toBe('/usr/sbin/sshd -D');
      expect(result).toHaveProperty(['host.name'], 'h1');
    });

    it('truncates dotted keys, array values and the rule description, without mutating input', () => {
      const description = 'd'.repeat(500);
      const source = {
        'process.command_line': [longValue],
        'kibana.alert.rule.description': description,
      };
      const result = truncateRelatedAlertLongFields(source);

      expect((result['process.command_line'] as string[])[0]).toBe(truncated(commandLineMax));
      expect(result['kibana.alert.rule.description']).toBe('d'.repeat(200) + suffix);
      expect(source['kibana.alert.rule.description']).toBe(description);
    });

    it('truncates mixed shape: dotted parent key holding a nested command_line', () => {
      const result = truncateRelatedAlertLongFields({
        'process.parent': { command_line: longValue },
      }) as Record<string, { command_line: string }>;

      expect(result['process.parent'].command_line).toBe(truncated(commandLineMax));
    });

    it('truncates mixed shape: nested process holding a dotted parent.command_line key', () => {
      const result = truncateRelatedAlertLongFields({
        process: { 'parent.command_line': longValue },
      }) as { process: Record<string, string> };

      expect(result.process['parent.command_line']).toBe(truncated(commandLineMax));
    });

    it('truncates objects inside arrays', () => {
      const result = truncateRelatedAlertLongFields({
        process: [{ command_line: longValue }, { command_line: 'short' }],
      }) as { process: Array<{ command_line: string }> };

      expect(result.process[0].command_line).toBe(truncated(commandLineMax));
      expect(result.process[1].command_line).toBe('short');
    });

    it('truncates both representations when dotted and nested keys are present together', () => {
      const result = truncateRelatedAlertLongFields({
        'process.command_line': longValue,
        process: { command_line: longValue },
      }) as Record<string, unknown> & { process: { command_line: string } };

      expect(result['process.command_line']).toBe(truncated(commandLineMax));
      expect(result.process.command_line).toBe(truncated(commandLineMax));
    });

    it('does not end on a lone high surrogate when the cut lands inside an emoji', () => {
      const value = `${'a'.repeat(commandLineMax - 1)}😀tail`;
      const result = truncateRelatedAlertLongFields({
        'process.command_line': value,
      })['process.command_line'] as string;

      expect(result).toBe('a'.repeat(commandLineMax - 1) + suffix);
      expect(result).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    });

    it('caps message, reason, rule name, process.executable and file.path', () => {
      const result = truncateRelatedAlertLongFields({
        message: 'm'.repeat(1000),
        'kibana.alert.reason': 'r'.repeat(1000),
        kibana: { alert: { rule: { name: 'n'.repeat(1000) } } },
        process: { executable: 'e'.repeat(1000) },
        'file.path': 'f'.repeat(1000),
      }) as Record<string, unknown> & {
        process: { executable: string };
        kibana: { alert: { rule: { name: string } } };
      };

      expect(result.message).toBe(`${'m'.repeat(300)}${suffix}`);
      expect(result['kibana.alert.reason']).toBe(`${'r'.repeat(300)}${suffix}`);
      expect(result.kibana.alert.rule.name).toBe(`${'n'.repeat(200)}${suffix}`);
      expect(result.process.executable).toBe(`${'e'.repeat(200)}${suffix}`);
      expect(result['file.path']).toBe(`${'f'.repeat(200)}${suffix}`);
    });

    it('ignores inherited Object.prototype keys such as constructor and toString', () => {
      const seven = ['1', '2', '3', '4', '5', '6', '7'];
      const source = {
        constructor: seven,
        nested: { toString: seven, valueOf: longValue },
        hasOwnProperty: longValue,
      };
      const result = truncateRelatedAlertLongFields(source) as typeof source;

      expect(result.constructor).toEqual(seven);
      expect(result.nested.toString).toEqual(seven);
      expect(result.nested.valueOf).toBe(longValue);
      expect(result.hasOwnProperty).toBe(longValue);
    });

    it('keeps only the first 5 elements of capped array fields and leaves other arrays alone', () => {
      const result = truncateRelatedAlertLongFields({
        'process.command_line': ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
        'host.name': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'],
      });

      expect(result['process.command_line']).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
      expect(result['host.name']).toHaveLength(7);
    });

    describe('MITRE threat reference stripping', () => {
      const threatEntries = () => [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0002',
            name: 'Execution',
            reference: 'https://attack.mitre.org/tactics/TA0002/',
          },
          technique: [
            {
              id: 'T1059',
              name: 'Command and Scripting Interpreter',
              reference: 'https://attack.mitre.org/techniques/T1059/',
              subtechnique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001/',
                },
                {
                  id: 'T1059.003',
                  name: 'Windows Command Shell',
                  reference: 'https://attack.mitre.org/techniques/T1059/003/',
                },
              ],
            },
            {
              id: 'T1204',
              name: 'User Execution',
              reference: 'https://attack.mitre.org/techniques/T1204/',
            },
          ],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0005',
            name: 'Defense Evasion',
            reference: 'https://attack.mitre.org/tactics/TA0005/',
          },
          technique: [
            {
              id: 'T1027',
              name: 'Obfuscated Files or Information',
              reference: 'https://attack.mitre.org/techniques/T1027/',
              subtechnique: [
                {
                  id: 'T1027.010',
                  name: 'Command Obfuscation',
                  reference: 'https://attack.mitre.org/techniques/T1027/010/',
                },
              ],
            },
          ],
        },
      ];

      const expectedThreat = [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0002', name: 'Execution' },
          technique: [
            {
              id: 'T1059',
              name: 'Command and Scripting Interpreter',
              subtechnique: [
                { id: 'T1059.001', name: 'PowerShell' },
                { id: 'T1059.003', name: 'Windows Command Shell' },
              ],
            },
            { id: 'T1204', name: 'User Execution' },
          ],
        },
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0005', name: 'Defense Evasion' },
          technique: [
            {
              id: 'T1027',
              name: 'Obfuscated Files or Information',
              subtechnique: [{ id: 'T1027.010', name: 'Command Obfuscation' }],
            },
          ],
        },
      ];

      it('strips references from the dotted-key shape and keeps ids and names', () => {
        const result = truncateRelatedAlertLongFields({
          'kibana.alert.rule.threat': threatEntries(),
        });

        expect(result['kibana.alert.rule.threat']).toEqual(expectedThreat);
        expect(JSON.stringify(result)).not.toContain('reference');
      });

      it('strips references from the nested shape', () => {
        const result = truncateRelatedAlertLongFields({
          kibana: { alert: { rule: { threat: threatEntries() } } },
        });

        expect(
          (result.kibana as { alert: { rule: { threat: unknown } } }).alert.rule.threat
        ).toEqual(expectedThreat);
        expect(JSON.stringify(result)).not.toContain('reference');
      });

      it('strips references from the mixed shape', () => {
        const result = truncateRelatedAlertLongFields({
          'kibana.alert.rule': { threat: threatEntries() },
        });

        expect((result['kibana.alert.rule'] as { threat: unknown }).threat).toEqual(expectedThreat);
        expect(JSON.stringify(result)).not.toContain('reference');
      });

      it('does not strip reference keys outside the threat path', () => {
        const result = truncateRelatedAlertLongFields({
          'kibana.alert.rule.threat': threatEntries(),
          'kibana.alert.rule.references': ['https://example.com'],
          file: { reference: 'keep-file', path: '/tmp/a' },
          'kibana.alert.rule': { reference: 'keep-rule' },
        }) as Record<string, unknown>;

        expect(result['kibana.alert.rule.references']).toEqual(['https://example.com']);
        expect(result.file).toEqual({ reference: 'keep-file', path: '/tmp/a' });
        expect(result['kibana.alert.rule']).toEqual({ reference: 'keep-rule' });
      });

      it('shrinks the serialized threat payload', () => {
        const source = { 'kibana.alert.rule.threat': threatEntries() };
        const before = JSON.stringify(source).length;
        const after = JSON.stringify(truncateRelatedAlertLongFields(source)).length;

        expect(after).toBeLessThan(before * 0.75);
      });
    });
  });
});
