/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationOutcome } from './investigation_outcome';

describe('investigationOutcome', () => {
  it.each([
    ['false_positive', 'False positive'],
    ['benign', 'Benign'],
    ['resolved', 'Resolved'],
    ['duplicate', 'Duplicate'],
    ['other', 'Closed'],
  ])('labels a %s close', (closeReason, label) => {
    expect(investigationOutcome({ status: 'closed', closeReason })).toBe(label);
  });

  it('has no outcome for an open investigation', () => {
    expect(investigationOutcome({ status: 'open', closeReason: 'resolved' })).toBeUndefined();
  });

  it('has no outcome for a close reason it does not know', () => {
    expect(investigationOutcome({ status: 'closed', closeReason: 'new-reason' })).toBeUndefined();
  });

  it('has no outcome for a close without a reason', () => {
    expect(investigationOutcome({ status: 'closed' })).toBeUndefined();
  });
});
