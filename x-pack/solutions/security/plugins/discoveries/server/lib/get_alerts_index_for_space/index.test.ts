/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsIndexForSpace } from '.';

describe('getAlertsIndexForSpace', () => {
  it('returns the default-space alerts index', () => {
    expect(getAlertsIndexForSpace('default')).toEqual('.alerts-security.alerts-default');
  });

  it('returns a non-default-space alerts index', () => {
    expect(getAlertsIndexForSpace('test-space')).toEqual('.alerts-security.alerts-test-space');
  });

  it('does not produce a cross-space wildcard', () => {
    expect(getAlertsIndexForSpace('marketing')).not.toContain('*');
  });
});
