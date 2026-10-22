/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serviceAccountActorName,
  workerDisplayNameForServiceAccount,
} from './service_account_display_name';

describe('workerDisplayNameForServiceAccount', () => {
  it('names the Alert Triage worker from its kibana principal', () => {
    expect(workerDisplayNameForServiceAccount('kibana/alertzero_alert_triage')).toBe(
      'Alert Triage'
    );
  });

  it('accepts the bare account name', () => {
    expect(workerDisplayNameForServiceAccount('alertzero_attack_discovery')).toBe(
      'Attack Discovery'
    );
  });

  it('leaves any other principal unnamed', () => {
    expect(workerDisplayNameForServiceAccount('kibana/nightshift-relay')).toBeUndefined();
    expect(workerDisplayNameForServiceAccount(undefined)).toBeUndefined();
    expect(workerDisplayNameForServiceAccount(null)).toBeUndefined();
  });
});

describe('serviceAccountActorName', () => {
  it('adds the service account qualifier for a caption that has one name slot', () => {
    expect(serviceAccountActorName('kibana/alertzero_alert_triage')).toBe(
      'Alert Triage (service account)'
    );
  });
});
