/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAnonymizedEvents } from '../../../mock/mock_anonymized_events';
import { getRetrieveOrGenerate } from '.';

describe('getRetrieveOrGenerate', () => {
  it("returns 'retrieve_anonymized_events' when anonymizedEvents is empty", () => {
    expect(getRetrieveOrGenerate([])).toBe('retrieve_anonymized_events');
  });

  it("returns 'generate' when anonymizedEvents is not empty", () => {
    expect(getRetrieveOrGenerate(mockAnonymizedEvents)).toBe('generate');
  });
});
