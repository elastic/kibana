/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatTestDuration } from './test_time_formats';

describe('formatTestDuration', () => {
  it.each`
    duration       | expected     | isMilli
    ${undefined}   | ${'0 ms'}    | ${undefined}
    ${120_000_000} | ${'2 mins'}  | ${undefined}
    ${6_200_000}   | ${'6.2 sec'} | ${false}
    ${500_000}     | ${'500 ms'}  | ${undefined}
    ${100}         | ${'0 ms'}    | ${undefined}
    ${undefined}   | ${'0 ms'}    | ${true}
    ${600_000}     | ${'10 mins'} | ${true}
    ${6_200}       | ${'6.2 sec'} | ${true}
    ${500}         | ${'500 ms'}  | ${true}
  `(
    'returns $expected when `duration` is $duration and `isMilli` $isMilli',
    ({
      duration,
      expected,
      isMilli,
    }: {
      duration?: number;
      expected: string;
      isMilli?: boolean;
    }) => {
      expect(formatTestDuration(duration, isMilli)).toBe(expected);
    }
  );
});
