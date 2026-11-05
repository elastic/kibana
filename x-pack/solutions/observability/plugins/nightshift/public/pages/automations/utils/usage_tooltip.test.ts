/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAutomationUsageTooltip } from './usage_tooltip';

describe('getAutomationUsageTooltip', () => {
  it('prefers the deployment limit copy over per-automation healthy or warning usage', () => {
    expect(
      getAutomationUsageTooltip({ used: 1, limit: 10, isGlobalLimitReached: true })
    ).toMatchObject({
      title: 'Deployment daily limit reached',
      content: 'No more runs until midnight (UTC)',
    });

    expect(
      getAutomationUsageTooltip({ used: 10, limit: 10, isGlobalLimitReached: true })
    ).toMatchObject({
      title: 'Deployment daily limit reached',
    });
  });

  it('returns to per-automation copy when the deployment quota is available again', () => {
    expect(
      getAutomationUsageTooltip({ used: 3, limit: 10, isGlobalLimitReached: false })
    ).toMatchObject({
      title: '3 of 10 triggers used today',
      content: 'Resets at midnight (UTC)',
    });

    expect(
      getAutomationUsageTooltip({ used: 10, limit: 10, isGlobalLimitReached: false })
    ).toMatchObject({
      title: 'Daily limit reached',
      content: 'No more runs until midnight (UTC)',
    });
  });
});
