/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceAnonymizedValuesWithOriginalValues } from '.';

describe('replaceAnonymizedValuesWithOriginalValues', () => {
  it('returns the message content with replacements applied', () => {
    expect(
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: 'Hello {{ host.name 32a823d4 }}',
        replacements: { '32a823d4': 'SRVWIN04' },
      })
    ).toBe('Hello {{ host.name SRVWIN04 }}');
  });
});
