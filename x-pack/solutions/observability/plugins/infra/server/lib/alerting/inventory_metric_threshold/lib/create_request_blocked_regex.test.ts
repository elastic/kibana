/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADDITIONAL_CONTEXT_BLOCKED_LIST,
  ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX,
} from './create_request';

describe('ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX', () => {
  it('should match blocked patterns exactly', () => {
    for (const pattern of ADDITIONAL_CONTEXT_BLOCKED_LIST) {
      // Replace '*' with a test string
      const testField = pattern.replace('*', 'usage');
      expect(ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX.test(testField)).toBe(true);
    }
  });

  it('should not match unrelated fields', () => {
    const allowedFields = [
      'host.memory.usage',
      'host.cpu',
      'hos*.cpu.**',
      'host.networkk.traffic',
      'host.cpuu.*',
      'host.dusk.*',
      'disk.io',
      'network.traffic',
      'cloud.instance.id',
      'labels.env',
    ];
    for (const field of allowedFields) {
      expect(ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX.test(field)).toBe(false);
    }
  });

  it('should match fields with any suffix after the wildcard', () => {
    const fields = ['host.cpu.total', 'host.disk.read', 'host.network.in'];
    fields.forEach((field) => expect(ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX.test(field)).toBe(true));
  });

  it('should not match partial field names', () => {
    const fields = ['host.cpu', 'host.disk', 'host.network'];
    fields.forEach((field) =>
      expect(ADDITIONAL_CONTEXT_BLOCKED_LIST_REGEX.test(field)).toBe(false)
    );
  });
});
