/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDecisionAutoCloseMode } from './constants';

describe('toDecisionAutoCloseMode', () => {
  it.each(['shadow', 'on', 'off'] as const)('reads %s as itself', (mode) => {
    expect(toDecisionAutoCloseMode(mode)).toBe(mode);
  });

  // Customers can turn AlertZero on, so a missing or mistyped flag must not start tagging or
  // closing alerts: only an exact `shadow` or `on` turns decisions on.
  it.each(['', 'On', 'SHADOW', 'true', 'enabled'])('reads %p as off', (value) => {
    expect(toDecisionAutoCloseMode(value)).toBe('off');
  });
});
