/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHasZeroAlerts } from '.';
import { mockAnonymizedAlerts } from '../../../../../evaluation/__mocks__/mock_anonymized_alerts';

describe('getHasZeroAlerts', () => {
  it('returns true when there are no alerts', () => {
    expect(getHasZeroAlerts([])).toBe(true);
  });

  it('returns false when there are alerts', () => {
    expect(getHasZeroAlerts(mockAnonymizedAlerts)).toBe(false);
  });
});
