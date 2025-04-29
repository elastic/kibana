/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduledAndAdHocIndexPattern } from '.';

describe('getScheduledAndAdHocIndexPattern', () => {
  it('returns the expected pattern for the `default` spaceId', () => {
    const spaceId = 'default';

    const result = getScheduledAndAdHocIndexPattern(spaceId);

    expect(result).toBe(
      '.alerts-security.attack.discovery.alerts-default,.alerts-security.attack.discovery.alerts-ad-hoc-default'
    );
  });

  it('returns the expected pattern for a non-default spaceId', () => {
    const spaceId = 'another-space';

    const result = getScheduledAndAdHocIndexPattern(spaceId);

    expect(result).toBe(
      '.alerts-security.attack.discovery.alerts-another-space,.alerts-security.attack.discovery.alerts-ad-hoc-another-space'
    );
  });
});
