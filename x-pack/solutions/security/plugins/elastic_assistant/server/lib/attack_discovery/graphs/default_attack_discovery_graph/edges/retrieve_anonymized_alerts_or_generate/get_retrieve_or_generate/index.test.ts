/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRetrieveOrGenerate } from '.';
import { mockAnonymizedAlerts } from '../../../../../evaluation/__mocks__/mock_anonymized_alerts';

describe('getRetrieveOrGenerate', () => {
  it("returns 'retrieve_anonymized_alerts' when anonymizedAlerts is empty", () => {
    expect(getRetrieveOrGenerate([])).toBe('retrieve_anonymized_alerts');
  });

  it("returns 'generate' when anonymizedAlerts is not empty", () => {
    expect(getRetrieveOrGenerate(mockAnonymizedAlerts)).toBe('generate');
  });
});
