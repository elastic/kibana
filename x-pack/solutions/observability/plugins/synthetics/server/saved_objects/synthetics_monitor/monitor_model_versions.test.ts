/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { fullHttpMonitor } from '../../../common/runtime_types/test_helpers/monitor_fixtures';
import { getLegacySyntheticsMonitorSavedObjectType } from './legacy_synthetics_monitor';
import { getSyntheticsMonitorConfigSavedObjectType } from './synthetics_monitor_config';

const multiSpaceType = getSyntheticsMonitorConfigSavedObjectType();
const legacyType = getLegacySyntheticsMonitorSavedObjectType(
  encryptedSavedObjectsMock.createSetup()
);

// The SavedObjectsModelVersionMap type has no string index, so describe only what is read here.
type ModelVersions = Record<
  string,
  { changes: unknown[]; schemas?: { create?: unknown; forwardCompatibility?: unknown } }
>;

// Both schemas are config-schema object types, so they expose `validate`.
const validate = (schema: unknown, value: unknown) =>
  (schema as { validate: (attrs: unknown) => unknown }).validate(value);

describe.each([
  ['synthetics-monitor-multi-space', multiSpaceType, '1'],
  ['synthetics-monitor (legacy)', legacyType, '3'],
])('%s model version schemas', (_name, type, version) => {
  const { schemas, changes } = (type.modelVersions as unknown as ModelVersions)[version];

  it('declares schemas without changing documents', () => {
    expect(changes).toEqual([]);
    expect(schemas?.create).toBeDefined();
    expect(schemas?.forwardCompatibility).toBeDefined();
  });

  it('rejects an unknown attribute on create', () => {
    expect(() =>
      validate(schemas?.create, { ...fullHttpMonitor(), schedule_interval_seconds: 10 })
    ).toThrow(/schedule_interval_seconds/);
  });

  it('strips an unknown attribute when a newer document is read', () => {
    const monitor = fullHttpMonitor();

    expect(
      validate(schemas?.forwardCompatibility, { ...monitor, schedule_interval_seconds: 10 })
    ).toEqual(monitor);
  });
});
