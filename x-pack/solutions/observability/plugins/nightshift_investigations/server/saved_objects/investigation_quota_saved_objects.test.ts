/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  nightshiftInvestigationQuotaSettingsAttributesSchemaV1,
  nightshiftInvestigationQuotaSettingsForwardCompatibilitySchemaV1,
} from './investigation_quota_saved_objects';

const settings = {
  enabled: true,
  limits: { automatic_investigation: 5, manual_investigation: null, total_investigation: 10 },
};

describe('investigation quota settings schemas', () => {
  it('accepts a limit of null and rejects 0, a fraction and an unknown limit when creating', () => {
    expect(nightshiftInvestigationQuotaSettingsAttributesSchemaV1.validate(settings)).toEqual(
      settings
    );
    for (const limits of [
      { ...settings.limits, manual_investigation: 0 },
      { ...settings.limits, manual_investigation: 1.5 },
      { ...settings.limits, future_group: 3 },
    ]) {
      expect(() =>
        nightshiftInvestigationQuotaSettingsAttributesSchemaV1.validate({ ...settings, limits })
      ).toThrow();
    }
  });

  it('drops unknown keys, including inside limits, when reading a newer model version', () => {
    const fromNewerVersion = {
      ...settings,
      future_flag: true,
      limits: { ...settings.limits, future_group: 3 },
    };

    expect(
      nightshiftInvestigationQuotaSettingsForwardCompatibilitySchemaV1.validate(fromNewerVersion)
    ).toEqual(settings);
  });

  it('still rejects known values that are invalid when reading a newer model version', () => {
    expect(() =>
      nightshiftInvestigationQuotaSettingsForwardCompatibilitySchemaV1.validate({
        ...settings,
        limits: { ...settings.limits, manual_investigation: 0 },
      })
    ).toThrow();
  });
});
