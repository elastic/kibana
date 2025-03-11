/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasEqlSequenceQuery,
  hasNestedEntry,
  isThreatMatchRule,
  normalizeMachineLearningJobIds,
  normalizeThresholdField,
  isMlRule,
  isEsqlRule,
  isSuppressionRuleInGA,
  isSuppressibleAlertRule,
  isSuppressionRuleConfiguredWithDuration,
  isSuppressionRuleConfiguredWithGroupBy,
  isSuppressionRuleConfiguredWithMissingFields,
  isEqlSequenceQuery,
} from './utils';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';

describe('#hasLargeValueList', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasLargeValueList([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryList exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'list',
        operator: 'included',
        list: { id: 'some id', type: 'ip' },
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryList does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeFalsy();
  });
});

describe('#hasNestedEntry', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasNestedEntry([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryNested exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'nested',
        entries: [
          { field: 'some field', type: 'match', operator: 'included', value: 'some value' },
        ],
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryNested does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeFalsy();
  });

  describe('isThreatMatchRule', () => {
    test('it returns true if a threat match rule', () => {
      expect(isThreatMatchRule('threat_match')).toEqual(true);
    });

    test('it returns false if not a threat match rule', () => {
      expect(isThreatMatchRule('query')).toEqual(false);
    });
  });
});

describe('isMlRule', () => {
  test('it returns true if a ML rule', () => {
    expect(isMlRule('machine_learning')).toEqual(true);
  });

  test('it returns false if not a Ml rule', () => {
    expect(isMlRule('query')).toEqual(false);
  });
});

describe('isEsqlRule', () => {
  test('it returns true if a ES|QL rule', () => {
    expect(isEsqlRule('esql')).toEqual(true);
  });

  test('it returns false if not a ES|QL rule', () => {
    expect(isEsqlRule('query')).toEqual(false);
  });
});

describe('#hasEqlSequenceQuery', () => {
  describe('when a non-sequence query is passed', () => {
    const query = 'process where process.name == "regsvr32.exe"';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });

  describe('when a sequence query is passed', () => {
    const query = 'sequence [process where process.name = "test.exe"]';
    it('should return true', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(true);
    });
  });

  describe('when a sequence query is passed with extra white space and escape characters', () => {
    const query = '\tsequence  \n [process    where   process.name = "test.exe"]';
    it('should return true', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(true);
    });
  });

  describe('when a non-sequence query is passed using the word sequence', () => {
    const query = 'sequence where true';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });

  describe('when a non-sequence query is passed using the word sequence with extra white space and escape characters', () => {
    const query = '  sequence\nwhere\ttrue';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });
});

describe('normalizeThresholdField', () => {
  it('converts a string to a string array', () => {
    expect(normalizeThresholdField('host.name')).toEqual(['host.name']);
  });
  it('returns a string array when a string array is passed in', () => {
    expect(normalizeThresholdField(['host.name'])).toEqual(['host.name']);
  });
  it('converts undefined to an empty array', () => {
    expect(normalizeThresholdField(undefined)).toEqual([]);
  });
  it('converts null to an empty array', () => {
    expect(normalizeThresholdField(null)).toEqual([]);
  });
  it('converts an empty string to an empty array', () => {
    expect(normalizeThresholdField('')).toEqual([]);
  });
});

describe('normalizeMachineLearningJobIds', () => {
  it('converts a string to a string array', () => {
    expect(normalizeMachineLearningJobIds('ml_job_id')).toEqual(['ml_job_id']);
  });

  it('preserves a single-valued array ', () => {
    expect(normalizeMachineLearningJobIds(['ml_job_id'])).toEqual(['ml_job_id']);
  });

  it('preserves a multi-valued array ', () => {
    expect(normalizeMachineLearningJobIds(['ml_job_id', 'other_ml_job_id'])).toEqual([
      'ml_job_id',
      'other_ml_job_id',
    ]);
  });
});

describe('Alert Suppression Rules', () => {
  describe('isSuppressibleAlertRule', () => {
    test('should return true for a suppressible rule type', () => {
      // Rule types that support alert suppression:
      expect(isSuppressibleAlertRule('esql')).toBe(true);
      expect(isSuppressibleAlertRule('threshold')).toBe(true);
      expect(isSuppressibleAlertRule('saved_query')).toBe(true);
      expect(isSuppressibleAlertRule('query')).toBe(true);
      expect(isSuppressibleAlertRule('threat_match')).toBe(true);
      expect(isSuppressibleAlertRule('new_terms')).toBe(true);
      expect(isSuppressibleAlertRule('eql')).toBe(true);
      expect(isSuppressibleAlertRule('machine_learning')).toBe(true);
    });

    test('should return false for an unknown rule type', () => {
      const ruleType = '123' as Type;
      const result = isSuppressibleAlertRule(ruleType);
      expect(result).toBe(false);
    });
  });

  describe('isSuppressionRuleInGA', () => {
    test('should return true for rule type suppression in global availability', () => {
      expect(isSuppressionRuleInGA('saved_query')).toBe(true);
      expect(isSuppressionRuleInGA('query')).toBe(true);
      expect(isSuppressionRuleInGA('esql')).toBe(true);
      expect(isSuppressionRuleInGA('threshold')).toBe(true);
      expect(isSuppressionRuleInGA('threat_match')).toBe(true);
      expect(isSuppressionRuleInGA('new_terms')).toBe(true);
      expect(isSuppressionRuleInGA('machine_learning')).toBe(true);
    });

    test('should return false for rule type suppression in tech preview', () => {
      expect(isSuppressionRuleInGA('eql')).toBe(false);
    });
  });
  describe('isSuppressionRuleConfiguredWithDuration', () => {
    test('should return true for a suppressible rule type', () => {
      // Rule types that support alert suppression:
      expect(isSuppressionRuleConfiguredWithDuration('esql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('threshold')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('saved_query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('threat_match')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('new_terms')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('eql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithDuration('machine_learning')).toBe(true);
    });

    test('should return false for an unknown rule type', () => {
      const ruleType = '123' as Type;
      const result = isSuppressionRuleConfiguredWithDuration(ruleType);
      expect(result).toBe(false);
    });
  });

  describe('isSuppressionRuleConfiguredWithGroupBy', () => {
    test('should return true for a suppressible rule type with groupBy', () => {
      // Rule types that support alert suppression groupBy:
      expect(isSuppressionRuleConfiguredWithGroupBy('esql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('saved_query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('threat_match')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('new_terms')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('eql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithGroupBy('machine_learning')).toBe(true);
    });

    test('should return false for a threshold rule type', () => {
      const result = isSuppressionRuleConfiguredWithGroupBy('threshold');
      expect(result).toBe(false);
    });

    test('should return false for an unknown rule type', () => {
      const ruleType = '123' as Type;
      const result = isSuppressionRuleConfiguredWithGroupBy(ruleType);
      expect(result).toBe(false);
    });
  });

  describe('isSuppressionRuleConfiguredWithMissingFields', () => {
    test('should return true for a suppressible rule type with missing fields', () => {
      // Rule types that support alert suppression groupBy:
      expect(isSuppressionRuleConfiguredWithMissingFields('esql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('saved_query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('query')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('threat_match')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('new_terms')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('eql')).toBe(true);
      expect(isSuppressionRuleConfiguredWithMissingFields('machine_learning')).toBe(true);
    });

    test('should return false for a threshold rule type', () => {
      const result = isSuppressionRuleConfiguredWithMissingFields('threshold');
      expect(result).toBe(false);
    });

    test('should return false for an unknown rule type', () => {
      const ruleType = '123' as Type;
      const result = isSuppressionRuleConfiguredWithMissingFields(ruleType);
      expect(result).toBe(false);
    });
  });

  describe('isEqlSequenceQuery', () => {
    it('is false if query is undefined', () => {
      const result = isEqlSequenceQuery(undefined);
      expect(result).toBe(false);
    });

    it('is false if query is an empty string', () => {
      const result = isEqlSequenceQuery('');
      expect(result).toBe(false);
    });

    it('is false if query is an nonempty string', () => {
      const result = isEqlSequenceQuery('any where true');
      expect(result).toBe(false);
    });

    it('is true if query begins with "sequence"', () => {
      const query = 'sequence where true';
      expect(isEqlSequenceQuery(query)).toBe(true);
    });

    it('is true if query begins with some whitespace and then "sequence"', () => {
      const query = '   sequence where true';
      expect(isEqlSequenceQuery(query)).toBe(true);
    });
  });
});
