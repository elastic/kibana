/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBS_ALERTING_FEATURES } from '@kbn/rule-data-utils';
import { getObservabilityAlertsFeature } from './alerts_feature';

describe('Observability Alerts Feature Privileges', () => {
  const feature = getObservabilityAlertsFeature();

  test('top-level alerting should list all OBS_ALERTING_FEATURES', () => {
    expect(feature.alerting).toEqual(OBS_ALERTING_FEATURES);
  });

  test('all privilege should grant alert.all and rule.mute_alerts', () => {
    const { alerting } = feature.privileges!.all;
    expect(alerting?.alert?.all).toEqual(OBS_ALERTING_FEATURES);
    expect(alerting?.rule?.mute_alerts).toEqual(OBS_ALERTING_FEATURES);
  });

  test('read privilege should grant alert.read and rule.read', () => {
    const { alerting } = feature.privileges!.read;
    expect(alerting?.alert?.read).toEqual(OBS_ALERTING_FEATURES);
    expect(alerting?.rule?.read).toEqual(OBS_ALERTING_FEATURES);
  });

  test('read privilege should not grant any write-level rule access', () => {
    const { alerting } = feature.privileges!.read;
    expect(alerting?.rule?.all).toBeUndefined();
    expect(alerting?.rule?.enable).toBeUndefined();
    expect(alerting?.rule?.manual_run).toBeUndefined();
    expect(alerting?.rule?.manage_rule_settings).toBeUndefined();
    expect(alerting?.rule?.mute_alerts).toBeUndefined();
  });
});
