/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedEntityIdentifier } from './helpers';

describe('getAnonymizedEntityIdentifier', () => {
  it('should return the anonymized key when the identifier matches a value in replacements', () => {
    const replacements: Replacements = {
      anonymized_user_123: 'john.doe',
      anonymized_host_456: 'web-server-01',
      anonymized_ip_789: '192.168.1.100',
    };
    const identifier = 'john.doe';

    const result = getAnonymizedEntityIdentifier(identifier, replacements);

    expect(result).toBe('anonymized_user_123');
  });

  it('should return undefined when the identifier is not found in replacements', () => {
    const replacements: Replacements = {
      anonymized_user_123: 'john.doe',
      anonymized_host_456: 'web-server-01',
    };
    const identifier = 'unknown.user';

    const result = getAnonymizedEntityIdentifier(identifier, replacements);

    expect(result).toBeUndefined();
  });

  it('should return undefined when replacements object is empty', () => {
    const replacements: Replacements = {};
    const identifier = 'john.doe';

    const result = getAnonymizedEntityIdentifier(identifier, replacements);

    expect(result).toBeUndefined();
  });
});
