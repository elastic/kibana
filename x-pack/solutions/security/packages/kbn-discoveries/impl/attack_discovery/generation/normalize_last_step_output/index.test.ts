/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertEsqlResultToAlerts, isEsqlShape, normalizeLastStepOutput } from '.';

describe('isEsqlShape', () => {
  it('returns true for a valid ES|QL shape with columns and values arrays', () => {
    const output = {
      columns: [
        { name: '_id', type: 'keyword' },
        { name: 'host.name', type: 'keyword' },
      ],
      values: [['alert-1', 'host-a']],
    };

    expect(isEsqlShape(output)).toBe(true);
  });

  it('returns true for a valid ES|QL shape with empty columns and values', () => {
    const output = {
      columns: [],
      values: [],
    };

    expect(isEsqlShape(output)).toBe(true);
  });

  it('returns true when extra properties are present alongside columns and values', () => {
    const output = {
      columns: [{ name: '_id', type: 'keyword' }],
      extra: 'ignored',
      values: [['alert-1']],
    };

    expect(isEsqlShape(output)).toBe(true);
  });

  it('returns false when columns is not an array', () => {
    const output = {
      columns: 'not-an-array',
      values: [],
    };

    expect(isEsqlShape(output)).toBe(false);
  });

  it('returns false when values is not an array', () => {
    const output = {
      columns: [],
      values: 'not-an-array',
    };

    expect(isEsqlShape(output)).toBe(false);
  });

  it('returns false when columns is missing', () => {
    const output = {
      values: [['alert-1']],
    };

    expect(isEsqlShape(output)).toBe(false);
  });

  it('returns false when values is missing', () => {
    const output = {
      columns: [{ name: '_id', type: 'keyword' }],
    };

    expect(isEsqlShape(output)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isEsqlShape(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isEsqlShape(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isEsqlShape('some string')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isEsqlShape(42)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isEsqlShape(true)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isEsqlShape([1, 2, 3])).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isEsqlShape({})).toBe(false);
  });
});

describe('convertEsqlResultToAlerts', () => {
  it('converts ES|QL columns/values to CSV-formatted alert strings with sorted keys', () => {
    const result = convertEsqlResultToAlerts({
      columns: [
        { name: 'kibana.alert.rule.name', type: 'keyword' },
        { name: '_id', type: 'keyword' },
        { name: 'kibana.alert.risk_score', type: 'double' },
      ],
      values: [
        ['Suspicious Process', 'alert-1', 75.0],
        ['Malware Detected', 'alert-2', 90.0],
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(
      [
        '_id,alert-1',
        'kibana.alert.risk_score,75',
        'kibana.alert.rule.name,Suspicious Process',
      ].join('\n')
    );
    expect(result[1]).toBe(
      ['_id,alert-2', 'kibana.alert.risk_score,90', 'kibana.alert.rule.name,Malware Detected'].join(
        '\n'
      )
    );
  });

  it('handles multi-value (array) fields by joining values with commas', () => {
    const result = convertEsqlResultToAlerts({
      columns: [
        { name: '_id', type: 'keyword' },
        { name: 'event.category', type: 'keyword' },
      ],
      values: [['alert-1', ['malware', 'intrusion_detection', 'process']]],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(
      ['_id,alert-1', 'event.category,malware,intrusion_detection,process'].join('\n')
    );
  });

  it('skips null and undefined values in rows', () => {
    const result = convertEsqlResultToAlerts({
      columns: [
        { name: '_id', type: 'keyword' },
        { name: 'host.name', type: 'keyword' },
        { name: 'process.name', type: 'keyword' },
      ],
      values: [['alert-1', null, 'evil.exe']],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(['_id,alert-1', 'process.name,evil.exe'].join('\n'));
  });

  it('returns an empty array when columns is not an array', () => {
    const result = convertEsqlResultToAlerts({
      columns: 'invalid' as unknown as Array<{ name: string; type: string }>,
      values: [],
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array when values is not an array', () => {
    const result = convertEsqlResultToAlerts({
      columns: [{ name: '_id', type: 'keyword' }],
      values: 'invalid' as unknown as unknown[][],
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array for empty values', () => {
    const result = convertEsqlResultToAlerts({
      columns: [{ name: '_id', type: 'keyword' }],
      values: [],
    });

    expect(result).toEqual([]);
  });
});

describe('normalizeLastStepOutput', () => {
  describe('ES|QL output (columns/values)', () => {
    it('converts ES|QL columns/values to CSV-formatted alert strings', () => {
      const output = {
        columns: [
          { name: '_id', type: 'keyword' },
          { name: 'kibana.alert.rule.name', type: 'keyword' },
        ],
        values: [
          ['alert-1', 'Rule A'],
          ['alert-2', 'Rule B'],
        ],
      };

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(['_id,alert-1', 'kibana.alert.rule.name,Rule A'].join('\n'));
      expect(result[1]).toBe(['_id,alert-2', 'kibana.alert.rule.name,Rule B'].join('\n'));
    });

    it('returns an empty array for ES|QL output with empty values', () => {
      const output = {
        columns: [{ name: '_id', type: 'keyword' }],
        values: [],
      };

      const result = normalizeLastStepOutput(output);

      expect(result).toEqual([]);
    });
  });

  describe('array of strings', () => {
    it('passes through an array of strings unchanged', () => {
      const output = ['alert-string-1', 'alert-string-2', 'alert-string-3'];

      const result = normalizeLastStepOutput(output);

      expect(result).toEqual(['alert-string-1', 'alert-string-2', 'alert-string-3']);
    });
  });

  describe('array of objects', () => {
    it('converts each object to a JSON string', () => {
      const output = [
        { _id: 'alert-1', rule: 'Suspicious Process' },
        { _id: 'alert-2', rule: 'Malware Detected' },
      ];

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(2);
      expect(JSON.parse(result[0])).toEqual({ _id: 'alert-1', rule: 'Suspicious Process' });
      expect(JSON.parse(result[1])).toEqual({ _id: 'alert-2', rule: 'Malware Detected' });
    });
  });

  describe('mixed array', () => {
    it('converts each element: strings pass through, objects are JSON-stringified', () => {
      const output = ['plain-alert-string', { _id: 'alert-1', severity: 'high' }, 42, true];

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(4);
      expect(result[0]).toBe('plain-alert-string');
      expect(JSON.parse(result[1])).toEqual({ _id: 'alert-1', severity: 'high' });
      expect(result[2]).toBe('42');
      expect(result[3]).toBe('true');
    });
  });

  describe('plain object', () => {
    it('wraps a single plain object in an array as a JSON string', () => {
      const output = { _id: 'alert-1', rule: 'Test Rule', severity: 'critical' };

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(1);
      expect(JSON.parse(result[0])).toEqual({
        _id: 'alert-1',
        rule: 'Test Rule',
        severity: 'critical',
      });
    });
  });

  describe('plain string', () => {
    it('wraps a single string in an array', () => {
      const output = 'a single alert string';

      const result = normalizeLastStepOutput(output);

      expect(result).toEqual(['a single alert string']);
    });
  });

  describe('number', () => {
    it('converts a number to a string and wraps it in an array', () => {
      const result = normalizeLastStepOutput(42);

      expect(result).toEqual(['42']);
    });

    it('handles zero', () => {
      const result = normalizeLastStepOutput(0);

      expect(result).toEqual(['0']);
    });

    it('handles negative numbers', () => {
      const result = normalizeLastStepOutput(-1);

      expect(result).toEqual(['-1']);
    });

    it('handles floating point numbers', () => {
      const result = normalizeLastStepOutput(3.14);

      expect(result).toEqual(['3.14']);
    });
  });

  describe('boolean', () => {
    it('converts true to a string and wraps it in an array', () => {
      const result = normalizeLastStepOutput(true);

      expect(result).toEqual(['true']);
    });

    it('converts false to a string and wraps it in an array', () => {
      const result = normalizeLastStepOutput(false);

      expect(result).toEqual(['false']);
    });
  });

  describe('null and undefined', () => {
    it('returns an empty array for null', () => {
      const result = normalizeLastStepOutput(null);

      expect(result).toEqual([]);
    });

    it('returns an empty array for undefined', () => {
      const result = normalizeLastStepOutput(undefined);

      expect(result).toEqual([]);
    });
  });

  describe('empty array', () => {
    it('returns an empty array for an empty input array', () => {
      const result = normalizeLastStepOutput([]);

      expect(result).toEqual([]);
    });
  });

  describe('nested objects', () => {
    it('JSON-stringifies objects with nested structures', () => {
      const output = {
        _id: 'alert-1',
        host: {
          name: 'host-a',
          os: {
            family: 'windows',
            version: '10.0',
          },
        },
        tags: ['production', 'web'],
      };

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(1);
      expect(JSON.parse(result[0])).toEqual({
        _id: 'alert-1',
        host: {
          name: 'host-a',
          os: {
            family: 'windows',
            version: '10.0',
          },
        },
        tags: ['production', 'web'],
      });
    });

    it('JSON-stringifies each element when the array contains objects with nested structures', () => {
      const output = [
        {
          _id: 'alert-1',
          process: {
            name: 'evil.exe',
            parent: { name: 'cmd.exe' },
          },
        },
        {
          _id: 'alert-2',
          process: {
            name: 'suspicious.sh',
            parent: { name: 'bash' },
          },
        },
      ];

      const result = normalizeLastStepOutput(output);

      expect(result).toHaveLength(2);
      expect(JSON.parse(result[0])).toEqual({
        _id: 'alert-1',
        process: {
          name: 'evil.exe',
          parent: { name: 'cmd.exe' },
        },
      });
      expect(JSON.parse(result[1])).toEqual({
        _id: 'alert-2',
        process: {
          name: 'suspicious.sh',
          parent: { name: 'bash' },
        },
      });
    });
  });
});
