/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { SavedObjectsType } from '@kbn/core/server';
import { getSyntheticsMonitorConfigSavedObjectType } from './synthetics_monitor_config';
import { getLegacySyntheticsMonitorSavedObjectType } from './legacy_synthetics_monitor';

const cases: Array<{
  name: string;
  getType: () => SavedObjectsType;
  fromVersion: number;
  toVersion: number;
}> = [
  {
    name: 'synthetics-monitor-multi-space',
    getType: getSyntheticsMonitorConfigSavedObjectType,
    fromVersion: 1,
    toVersion: 2,
  },
  {
    name: 'synthetics-monitor (legacy)',
    getType: () => {
      const esoSetup = encryptedSavedObjectsMock.createSetup();
      // The legacy type builds its 8.x migrations with createMigration. The mock returns
      // undefined, which the document migrator rejects, so hand back a pass-through.
      esoSetup.createMigration.mockImplementation(() => (doc: unknown) => doc as never);
      return getLegacySyntheticsMonitorSavedObjectType(esoSetup);
    },
    fromVersion: 3,
    toVersion: 4,
  },
];

describe.each(cases)('schedule_interval_seconds model version: $name', (testCase) => {
  const { fromVersion, toVersion } = testCase;
  let migrator: ModelVersionTestMigrator;

  const doc = (attributes: Record<string, unknown>) => ({
    id: 'mon-1',
    type: testCase.getType().name,
    attributes: { name: 'monitor', ...attributes },
    references: [],
  });

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: testCase.getType() });
  });

  it('backfills the duration in seconds on upgrade', () => {
    const seconds = migrator.migrate({
      document: doc({ schedule: { number: '10', unit: 's' } }),
      fromVersion,
      toVersion,
    });
    const minutes = migrator.migrate({
      document: doc({ schedule: { number: '10', unit: 'm' } }),
      fromVersion,
      toVersion,
    });

    expect(seconds.attributes).toMatchObject({ schedule_interval_seconds: 10 });
    expect(minutes.attributes).toMatchObject({ schedule_interval_seconds: 600 });
  });

  it('treats a missing unit as minutes', () => {
    const migrated = migrator.migrate({
      document: doc({ schedule: { number: '3' } }),
      fromVersion,
      toVersion,
    });

    expect(migrated.attributes).toMatchObject({ schedule_interval_seconds: 180 });
  });

  it('does not throw for a non-numeric schedule number, and the value serializes to null', () => {
    const migrated = migrator.migrate({
      document: doc({ schedule: { number: 'abc', unit: 'm' } }),
      fromVersion,
      toVersion,
    });

    const value = (migrated.attributes as Record<string, unknown>).schedule_interval_seconds;
    expect(value).toBeNaN();
    expect(JSON.parse(JSON.stringify(migrated.attributes)).schedule_interval_seconds).toBeNull();
  });

  it('strips the field on rollback and keeps the rest of the document', () => {
    const migrated = migrator.migrate({
      document: doc({
        schedule: { number: '10', unit: 's' },
        schedule_interval_seconds: 10,
      }),
      fromVersion: toVersion,
      toVersion: fromVersion,
    });

    expect(migrated.attributes).not.toHaveProperty('schedule_interval_seconds');
    expect(migrated.attributes).toMatchObject({
      name: 'monitor',
      schedule: { number: '10', unit: 's' },
    });
  });
});
