/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSensitiveOutputFields } from './esql_sensitive_fields';

describe('getSensitiveOutputFields', () => {
  it('marks derived fields as sensitive when they depend on PII', () => {
    const query = 'FROM logs | EVAL full_name = user.name + " " + user.email | KEEP full_name';
    const piiRegistry = new Set(['user.name', 'user.email']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('full_name')).toBe(true);
  });

  it('propagates sensitivity through renames', () => {
    const query = 'FROM logs | RENAME user.name AS username | KEEP username';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('username')).toBe(true);
  });

  it('marks aggregation keys as sensitive when they are PII', () => {
    const query = 'FROM logs | STATS count = COUNT(*) BY user.name | KEEP user.name, count';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('user.name')).toBe(true);
  });

  it('marks output sensitive when PII is used in a function', () => {
    const query = 'FROM logs | EVAL anonymized = HASH(user.email) | KEEP anonymized';
    const piiRegistry = new Set(['user.email']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('anonymized')).toBe(true);
  });

  it('does not flag aggregation output when aggregation key has no PII', () => {
    const query = 'FROM logs | STATS count = COUNT(*) BY UNKNOWN_FUNC(user.email) | KEEP count';
    const piiRegistry = new Set<string>();
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('count')).toBe(false);
  });

  it('does not flag fields when only safe functions are used with no PII', () => {
    const query = 'FROM logs | EVAL normalized = TO_LOWER(field1) | KEEP normalized';
    const piiRegistry = new Set<string>();
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.size).toBe(0);
  });

  it('flags output when base field is directly sensitive', () => {
    const query = 'FROM logs | KEEP user.name';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('user.name')).toBe(true);
  });

  it('handles multiple output columns with mixed sensitivity', () => {
    const query = 'FROM logs | KEEP user.name, host.name, event.code';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('user.name')).toBe(true);
    expect(sensitiveFields.has('host.name')).toBe(false);
    expect(sensitiveFields.has('event.code')).toBe(false);
  });

  it('propagates sensitivity through chained EVALs', () => {
    const query = 'FROM logs | EVAL step1 = user.name | EVAL step2 = step1 + "x" | KEEP step2';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('step2')).toBe(true);
  });

  it('propagates sensitivity through arithmetic operations', () => {
    const query = 'FROM logs | EVAL risk = user.score + 10 | KEEP risk';
    const piiRegistry = new Set(['user.score']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('risk')).toBe(true);
  });

  it('propagates sensitivity through CASE expressions', () => {
    const query = 'FROM logs | EVAL result = CASE(user.name == "a", field1, field2) | KEEP result';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles nested functions with PII inputs', () => {
    const query = 'FROM logs | EVAL result = ABS(ROUND(user.score, 2)) | KEEP result';
    const piiRegistry = new Set(['user.score']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('marks aggregation keys sensitive when derived from PII', () => {
    const query = 'FROM logs | STATS count = COUNT(*) BY user.name + "x" | KEEP user.name, count';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('user.name')).toBe(true);
  });

  it('marks aggregation output sensitive when it depends on PII', () => {
    const query = 'FROM logs | STATS avg_score = AVG(user.score) | KEEP avg_score';
    const piiRegistry = new Set(['user.score']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('avg_score')).toBe(true);
  });

  it('handles multiple aggregation keys and metrics', () => {
    const query =
      'FROM logs | STATS avg_score = AVG(user.score), max_age = MAX(user.age) BY user.name, host.name | KEEP avg_score, max_age, host.name';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('avg_score')).toBe(false);
    expect(sensitiveFields.has('max_age')).toBe(false);
    expect(sensitiveFields.has('host.name')).toBe(false);
  });

  it('propagates sensitivity through RENAME with new syntax', () => {
    const query = 'FROM logs | RENAME new_user = user.name | KEEP new_user';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('new_user')).toBe(true);
  });

  it('treats hash functions as propagating sensitivity', () => {
    const query = 'FROM logs | EVAL masked = SHA256(user.email) | KEEP masked';
    const piiRegistry = new Set(['user.email']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('masked')).toBe(true);
  });

  it('treats safe functions as non-sensitive when PII not involved', () => {
    const query = 'FROM logs | EVAL trimmed = TRIM(field1) | KEEP trimmed';
    const piiRegistry = new Set<string>();
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.size).toBe(0);
  });

  it('does not flag output for unknown functions without PII', () => {
    const query = 'FROM logs | EVAL masked = UNKNOWN_FUNC(field1) | KEEP masked';
    const piiRegistry = new Set<string>();
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('masked')).toBe(false);
  });

  it('handles queries without KEEP by using final columns', () => {
    const query = 'FROM logs | EVAL full_name = user.name + " " + user.email';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('full_name')).toBe(true);
  });

  it('handles basic EVAL with KEEP', () => {
    const query = 'FROM foo | EVAL aggr = field1 + field2 + field3 | KEEP aggr';
    const piiRegistry = new Set(['field1', 'field2', 'field3']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('aggr')).toBe(true);
  });

  it('handles single field assignment', () => {
    const query = 'FROM logs | EVAL total = count | KEEP total';
    const piiRegistry = new Set(['count']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('total')).toBe(true);
  });

  it('handles subtraction operation', () => {
    const query = 'FROM data | EVAL diff = field1 - field2 | KEEP diff';
    const piiRegistry = new Set(['field1']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('diff')).toBe(true);
  });

  it('handles multiplication and division', () => {
    const query = 'FROM data | EVAL result = field1 * field2 / field3 | KEEP result';
    const piiRegistry = new Set(['field1', 'field2', 'field3']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles nested arithmetic expressions', () => {
    const query =
      'FROM logs | EVAL complex = (field1 + field2) * (field3 - field4) / field5 | KEEP complex';
    const piiRegistry = new Set(['field1']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('complex')).toBe(true);
  });

  it('handles function calls with multiple arguments', () => {
    const query = 'FROM data | EVAL result = ABS(field1) + ROUND(field2, 2) * field3 | KEEP result';
    const piiRegistry = new Set(['field1']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles nested function calls', () => {
    const query = 'FROM logs | EVAL nested = ABS(ROUND(field1 + field2, 2)) * field3 | KEEP nested';
    const piiRegistry = new Set(['field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('nested')).toBe(true);
  });

  it('handles multiple EVAL statements', () => {
    const query =
      'FROM data | EVAL step1 = field1 + field2 | EVAL step2 = step1 * field3 | EVAL final = step2 - field4 | KEEP final';
    const piiRegistry = new Set(['field4']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('final')).toBe(true);
  });

  it('handles complex nested expressions with parentheses', () => {
    const query =
      'FROM logs | EVAL result = ((field1 + field2) * field3) / ((field4 - field5) + field6) | KEEP result';
    const piiRegistry = new Set(['field6']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles STATS aggregations', () => {
    const query =
      'FROM logs | STATS avg_field = AVG(field1), sum_field = SUM(field2 + field3) | KEEP avg_field, sum_field';
    const piiRegistry = new Set(['field1', 'field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('avg_field')).toBe(true);
    expect(sensitiveFields.has('sum_field')).toBe(true);
  });

  it('handles STATS with BY clause', () => {
    const query =
      'FROM logs | STATS count_field = COUNT(field1), max_field = MAX(field2) BY group_field | KEEP count_field, max_field';
    const piiRegistry = new Set(['field1', 'field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('count_field')).toBe(true);
    expect(sensitiveFields.has('max_field')).toBe(true);
  });

  it('handles complex STATS expressions', () => {
    const query =
      'FROM data | STATS result = AVG((field1 + field2) * field3) BY category | KEEP result';
    const piiRegistry = new Set(['field3']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles EVAL followed by KEEP', () => {
    const query = 'FROM logs | EVAL computed = field1 + field2 | KEEP computed';
    const piiRegistry = new Set(['field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('computed')).toBe(true);
  });

  it('handles multiple EVALs with KEEP', () => {
    const query =
      'FROM data | EVAL temp1 = field1 * 2 | EVAL temp2 = field2 + field3 | EVAL final = temp1 + temp2 | KEEP final';
    const piiRegistry = new Set(['field3']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('final')).toBe(true);
  });

  it('handles WHERE clause with EVAL', () => {
    const query = 'FROM logs | WHERE field1 > 100 | EVAL result = field2 + field3 | KEEP result';
    const piiRegistry = new Set(['field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles nested field names', () => {
    const query = 'FROM logs | EVAL result = user.name + other.field | KEEP result';
    const piiRegistry = new Set(['user.name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles quoted field names', () => {
    const query = 'FROM logs | EVAL result = `field-name` + `another-field` | KEEP result';
    const piiRegistry = new Set(['field-name']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles modulo operation', () => {
    const query = 'FROM data | EVAL remainder = field1 % field2 | KEEP remainder';
    const piiRegistry = new Set(['field1']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('remainder')).toBe(true);
  });

  it('handles deeply nested expressions', () => {
    const query =
      'FROM logs | EVAL step1 = (field1 + field2) * field3 | EVAL step2 = ABS(step1 - field4) | EVAL step3 = ROUND(step2 / field5, 2) | EVAL final = step3 + field6 * field7 | KEEP final';
    const piiRegistry = new Set(['field5']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('final')).toBe(true);
  });

  it('handles STATS with complex aggregations and multiple BY fields', () => {
    const query =
      'FROM data | STATS avg_val = AVG((field1 + field2) * field3), sum_val = SUM(field4 - field5), count_val = COUNT(field6) BY category, subcategory | KEEP avg_val, sum_val, count_val';
    const piiRegistry = new Set(['field3', 'field4', 'field6']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('avg_val')).toBe(true);
    expect(sensitiveFields.has('sum_val')).toBe(true);
    expect(sensitiveFields.has('count_val')).toBe(true);
  });

  it('handles WHERE with multiple EVALs and KEEP', () => {
    const query =
      'FROM logs | WHERE status == "active" | EVAL temp1 = field1 * 2 | EVAL temp2 = field2 + field3 | EVAL combined = temp1 + temp2 | EVAL percentage = (combined / field4) * 100 | KEEP percentage, combined';
    const piiRegistry = new Set(['field4']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('percentage')).toBe(true);
    expect(sensitiveFields.has('combined')).toBe(true);
  });

  it('handles date functions and arithmetic', () => {
    const query =
      'FROM logs | EVAL days_diff = DATE_DIFF("days", field1, field2) | EVAL hours_total = days_diff * 24 + field3 | EVAL result = hours_total / field4 | KEEP result';
    const piiRegistry = new Set(['field1']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles string functions and field references', () => {
    const query =
      'FROM logs | EVAL concat_result = CONCAT(field1, field2, field3) | EVAL upper_result = TO_UPPER(field4) | EVAL combined = concat_result + " " + upper_result | KEEP combined';
    const piiRegistry = new Set(['field2']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('combined')).toBe(true);
  });

  it('handles conditional expressions', () => {
    const query =
      'FROM data | EVAL result = CASE(field1 > field2, field3, CASE(field1 == field2, field4, field5)) | KEEP result';
    const piiRegistry = new Set(['field5']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('result')).toBe(true);
  });

  it('handles multiple aggregations and computed fields', () => {
    const query =
      'FROM logs | EVAL normalized = field1 / field2 | STATS avg_norm = AVG(normalized), sum_field3 = SUM(field3), max_field4 = MAX(field4 * field5) BY category';
    const piiRegistry = new Set(['field1', 'field3', 'field4']);
    const sensitiveFields = getSensitiveOutputFields(query, piiRegistry);

    expect(sensitiveFields.has('avg_norm')).toBe(true);
    expect(sensitiveFields.has('sum_field3')).toBe(true);
    expect(sensitiveFields.has('max_field4')).toBe(true);
  });

  it('handles empty query', () => {
    const sensitiveFields = getSensitiveOutputFields('', new Set(['field1']));
    expect(sensitiveFields.size).toBe(0);
  });

  it('handles invalid query gracefully', () => {
    const sensitiveFields = getSensitiveOutputFields('INVALID QUERY SYNTAX', new Set(['field1']));
    expect(sensitiveFields.size).toBe(0);
  });

  it('handles query with only FROM', () => {
    const sensitiveFields = getSensitiveOutputFields('FROM logs', new Set(['field1']));
    expect(sensitiveFields.size).toBe(0);
  });
});
