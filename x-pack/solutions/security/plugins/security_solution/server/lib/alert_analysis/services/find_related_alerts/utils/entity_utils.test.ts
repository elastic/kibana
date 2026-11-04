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

    it('truncates long nested command lines and keeps short values and other fields intact', () => {
      const source = {
        'host.name': 'h1',
        process: { command_line: longValue, parent: { command_line: '/usr/sbin/sshd -D' } },
      };
      const result = truncateRelatedAlertLongFields(source) as {
        process: { command_line: string; parent: { command_line: string } };
      };

      expect(result.process.command_line.length).toBeLessThan(longValue.length);
      expect(result.process.command_line.startsWith('a'.repeat(commandLineMax))).toBe(true);
      expect(result.process.command_line).toContain('[truncated]');
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

      expect((result['process.command_line'] as string[])[0]).toContain('[truncated]');
      expect(result['kibana.alert.rule.description'] as string).toContain('[truncated]');
      expect(source['kibana.alert.rule.description']).toBe(description);
    });
  });
});
