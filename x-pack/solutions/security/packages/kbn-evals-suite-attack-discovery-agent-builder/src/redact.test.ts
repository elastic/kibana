/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { redactExecutionIds } from './redact';

describe('redactExecutionIds', () => {
  it('recursively removes execution identifiers from serializable output', () => {
    expect(
      redactExecutionIds({
        execution_uuid: '11111111-1111-4111-8111-111111111111',
        nested: ['11111111-1111-4111-8111-111111111111'],
      })
    ).toEqual({
      execution_uuid: '[REDACTED_EXECUTION_ID]',
      nested: ['[REDACTED_EXECUTION_ID]'],
    });
  });
});
