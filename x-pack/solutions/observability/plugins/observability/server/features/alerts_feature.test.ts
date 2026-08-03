/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getObservabilityAlertsFeature } from './alerts_feature';

describe('Observability Alerts Feature Privileges', () => {
  const feature = getObservabilityAlertsFeature();
  const allPrivilege = feature.privileges?.all;
  const readPrivilege = feature.privileges?.read;

  test('feature ID is observabilityAlerts', () => {
    expect(feature.id).toBe('observabilityAlerts');
  });

  test('top-level management grants the Alerts link but not Rules', () => {
    expect(feature.management?.insightsAndAlerting).toContain('triggersActionsAlerts');
    expect(feature.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
  });

  test('both privileges grant access to the Alerts management link but not Rules', () => {
    expect(allPrivilege?.management?.insightsAndAlerting).toContain('triggersActionsAlerts');
    expect(readPrivilege?.management?.insightsAndAlerting).toContain('triggersActionsAlerts');
    expect(allPrivilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
    expect(readPrivilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
  });
});
