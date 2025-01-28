/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';

import { getControlledArtifactCutoffDate } from './controlled_artifact_rollout';

describe('Controlled artifact rollout cut off date', () => {
  const eighteenMonthsAgo = moment.utc().subtract(18, 'months').add(1, 'day').startOf('day');
  it('should return date 18 months ago if start date is older than 18 months', () => {
    expect(
      getControlledArtifactCutoffDate(moment('2020-10-01T00:00:00Z').utc()).startOf('day')
    ).toEqual(eighteenMonthsAgo.startOf('day'));
  });

  it("should return today's date since it is more recent than 18 months", () => {
    const today = moment().utc();
    expect(getControlledArtifactCutoffDate(today)).toEqual(today);
  });
});
