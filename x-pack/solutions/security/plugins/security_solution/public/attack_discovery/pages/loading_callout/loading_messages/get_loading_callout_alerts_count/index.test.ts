/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLoadingCalloutAlertsCount } from '.';

describe('getLoadingCalloutAlertsCount', () => {
  it('returns alertsContextCount when it is a positive number', () => {
    const alertsContextCount = 5; // <-- positive number

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount,
      defaultMaxAlerts: 10,
      localStorageAttackDiscoveryMaxAlerts: '15',
    });

    expect(result).toBe(alertsContextCount);
  });

  it('returns defaultMaxAlerts when localStorageAttackDiscoveryMaxAlerts is undefined', () => {
    const defaultMaxAlerts = 10;

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount: null,
      defaultMaxAlerts,
      localStorageAttackDiscoveryMaxAlerts: undefined, // <-- undefined
    });

    expect(result).toBe(defaultMaxAlerts);
  });

  it('returns defaultMaxAlerts when localStorageAttackDiscoveryMaxAlerts is NaN', () => {
    const defaultMaxAlerts = 10;

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount: 0, // <-- not a valid alertsContextCount
      defaultMaxAlerts,
      localStorageAttackDiscoveryMaxAlerts: 'NaN', // <-- NaN
    });

    expect(result).toBe(defaultMaxAlerts);
  });

  it('returns defaultMaxAlerts when localStorageAttackDiscoveryMaxAlerts is 0', () => {
    const defaultMaxAlerts = 10;

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount: 0, // <-- not a valid alertsContextCount
      defaultMaxAlerts,
      localStorageAttackDiscoveryMaxAlerts: '0', // <-- NaN
    });

    expect(result).toBe(defaultMaxAlerts);
  });

  it("returns size from localStorageAttackDiscoveryMaxAlerts when it's a positive number", () => {
    const localStorageAttackDiscoveryMaxAlerts = '15'; // <-- positive number

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount: null,
      defaultMaxAlerts: 10,
      localStorageAttackDiscoveryMaxAlerts,
    });

    expect(result).toBe(15);
  });

  it('returns defaultMaxAlerts when localStorageAttackDiscoveryMaxAlerts is negative', () => {
    const localStorageAttackDiscoveryMaxAlerts = '-5'; // <-- negative number
    const defaultMaxAlerts = 10;

    const result = getLoadingCalloutAlertsCount({
      alertsContextCount: null,
      defaultMaxAlerts: 10,
      localStorageAttackDiscoveryMaxAlerts,
    });

    expect(result).toBe(defaultMaxAlerts);
  });
});
