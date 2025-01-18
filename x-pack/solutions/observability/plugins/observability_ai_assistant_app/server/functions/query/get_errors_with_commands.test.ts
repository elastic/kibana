/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getErrorsWithCommands } from './get_errors_with_commands';

describe('getErrorsWithCommands', () => {
  it('returns the command associated with the error', () => {
    expect(
      getErrorsWithCommands(`FROM logs-* | WHERE @timestamp <= NOW() | STATS BY host.name`, [
        {
          type: 'error',
          text: 'Syntax error',
          code: '',
          location: {
            min: 24,
            max: 36,
          },
        },
      ])
    ).toEqual(['Error in `| WHERE @timestamp <= NOW()`:\n Syntax error']);
  });
});
