/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildWatchAutonomyUiSettingKey,
  SYSTEM_SECURITY_WATCH_IDS,
  WATCH_AUTONOMY_LEVELS,
} from '@kbn/pnd-common';
import { DEFAULT_AUTONOMY_LEVEL } from '../as_watch_autonomy_level';
import { getAutonomyUiSettings } from '.';

describe('getAutonomyUiSettings', () => {
  it('registers exactly one setting per managed system watch', () => {
    expect(Object.keys(getAutonomyUiSettings())).toHaveLength(SYSTEM_SECURITY_WATCH_IDS.length);
  });

  it.each(SYSTEM_SECURITY_WATCH_IDS)('registers the autonomy key for watch "%s"', (watchId) => {
    expect(getAutonomyUiSettings()).toHaveProperty(buildWatchAutonomyUiSettingKey(watchId));
  });

  it('defaults every setting to the most conservative autonomy level', () => {
    const values = Object.values(getAutonomyUiSettings()).map((setting) => setting.value);

    expect(values.every((value) => value === DEFAULT_AUTONOMY_LEVEL)).toBe(true);
  });

  it('defaults to manual', () => {
    expect(DEFAULT_AUTONOMY_LEVEL).toBe('manual');
  });

  it('offers exactly the shared scale as the selectable options', () => {
    const [setting] = Object.values(getAutonomyUiSettings());

    expect(setting.options).toEqual([...WATCH_AUTONOMY_LEVELS]);
  });

  it('marks every setting readonly so it stays out of the Advanced Settings editor', () => {
    const readonly = Object.values(getAutonomyUiSettings()).map((setting) => setting.readonly);

    expect(readonly.every((value) => value === true)).toBe(true);
  });

  it('gives every setting a validation schema', () => {
    const schemas = Object.values(getAutonomyUiSettings()).map((setting) => setting.schema);

    expect(schemas.every((value) => value != null)).toBe(true);
  });

  it.each([...WATCH_AUTONOMY_LEVELS])('accepts the level "%s" via the schema', (level) => {
    const [setting] = Object.values(getAutonomyUiSettings());

    expect(() => setting.schema.validate(level)).not.toThrow();
  });

  it('rejects a level outside the shared scale via the schema', () => {
    const [setting] = Object.values(getAutonomyUiSettings());

    expect(() => setting.schema.validate('autonomous')).toThrow();
  });

  // The dial is no longer an ordinal, so the schema is what stops a legacy write re-introducing one.
  it('rejects a legacy ordinal level via the schema', () => {
    const [setting] = Object.values(getAutonomyUiSettings());

    expect(() => setting.schema.validate(3)).toThrow();
  });
});
