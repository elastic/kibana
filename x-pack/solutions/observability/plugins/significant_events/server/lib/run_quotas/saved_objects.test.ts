/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { backfillUnlimitedInvestigationLimits } from './saved_objects';

describe('backfillUnlimitedInvestigationLimits', () => {
  it('turns stored zero investigation limits into no limit and keeps other limits', () => {
    expect(
      backfillUnlimitedInvestigationLimits({
        detection: 0,
        investigation: 0,
        manual_investigation: 5,
        total_investigation: 0,
        ki_extraction: 0,
      })
    ).toEqual({
      detection: 0,
      investigation: -1,
      manual_investigation: 5,
      total_investigation: -1,
      ki_extraction: 0,
    });
  });
});
