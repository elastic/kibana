/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeRowAriaLabel } from '.';

describe('composeRowAriaLabel', () => {
  it('composes headline, case id and score', () => {
    expect(
      composeRowAriaLabel({
        caseId: 'CASE-94',
        riskScore: 94,
        title: 'Credential dumping on host-1',
      })
    ).toEqual('Credential dumping on host-1, CASE-94, risk score 94');
  });

  it('includes a real score of zero rather than dropping it', () => {
    expect(
      composeRowAriaLabel({
        caseId: 'CASE-0',
        riskScore: 0,
        title: 'Benign activity',
      })
    ).toEqual('Benign activity, CASE-0, risk score 0');
  });

  it('omits the score clause when no score was derived', () => {
    expect(
      composeRowAriaLabel({
        caseId: 'CASE-1',
        title: 'Credential dumping on host-1',
      })
    ).toEqual('Credential dumping on host-1, CASE-1');
  });
});
