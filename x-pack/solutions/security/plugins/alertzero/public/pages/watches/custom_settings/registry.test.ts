/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  getWorkerCustomSettingFields,
} from '@kbn/alertzero-common';
import { assertWatchCustomSettingsComplete } from './registry';

describe('Watch custom settings completeness', () => {
  it('covers every declared custom field and leaves shared-only Workers without a component', () => {
    expect(getWorkerCustomSettingFields(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID)).toEqual([
      'analysisWindowDays',
    ]);
    expect(getWorkerCustomSettingFields(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)).toEqual([]);
    expect(getWorkerCustomSettingFields(SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID)).toEqual(
      []
    );
    expect(getWorkerCustomSettingFields(SYSTEM_SECURITY_WATCH_DETECTION_ID)).toEqual([]);

    expect(() => assertWatchCustomSettingsComplete()).not.toThrow();
  });
});
