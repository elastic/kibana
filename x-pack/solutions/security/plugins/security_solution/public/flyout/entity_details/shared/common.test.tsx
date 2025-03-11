/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnomaliesFields } from './common';
import { emptyMlCapabilities } from '../../../../common/machine_learning/empty_ml_capabilities';

const emptyMlCapabilitiesProvider = {
  ...emptyMlCapabilities,
  capabilitiesFetched: false,
};

describe('getAnomaliesFields', () => {
  it('returns max anomaly score', () => {
    const field = getAnomaliesFields(emptyMlCapabilitiesProvider);

    expect(field[0].label).toBe('Max anomaly score by job');
  });

  it('hides anomalies field when user has no permissions', () => {
    const field = getAnomaliesFields(emptyMlCapabilitiesProvider);

    expect(field[0].isVisible()).toBeFalsy();
  });

  it('shows anomalies field when user has permissions', () => {
    const mlCapabilitiesProvider = {
      ...emptyMlCapabilities,
      capabilitiesFetched: false,
      capabilities: {
        ...emptyMlCapabilities.capabilities,
        canGetJobs: true,
        canGetDatafeeds: true,
        canGetCalendars: true,
      },
    };

    const field = getAnomaliesFields(mlCapabilitiesProvider);

    expect(field[0].isVisible()).toBeTruthy();
  });
});
