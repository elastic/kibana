/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { isMonitorBulkEditable, monitorUsesPublicLocations } from './bulk_edit_eligibility';

const makeMonitor = ({
  origin = SourceType.UI,
  serviceManaged = false,
}: {
  origin?: SourceType;
  serviceManaged?: boolean;
} = {}): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: 'id',
    [ConfigKey.NAME]: 'name',
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.LOCATIONS]: [{ id: 'loc', isServiceManaged: serviceManaged }],
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('bulk edit eligibility', () => {
  describe('monitorUsesPublicLocations', () => {
    it('is true when any location is service managed', () => {
      expect(monitorUsesPublicLocations(makeMonitor({ serviceManaged: true }))).toBe(true);
    });

    it('is false when no location is service managed', () => {
      expect(monitorUsesPublicLocations(makeMonitor({ serviceManaged: false }))).toBe(false);
    });
  });

  describe('isMonitorBulkEditable', () => {
    it('excludes non-ui monitors regardless of permissions', () => {
      expect(isMonitorBulkEditable(makeMonitor({ origin: SourceType.PROJECT }), true)).toBe(false);
    });

    it('allows ui monitors on private locations even without public-location permission', () => {
      expect(isMonitorBulkEditable(makeMonitor({ serviceManaged: false }), false)).toBe(true);
    });

    it('excludes ui monitors on public locations when the user lacks the permission', () => {
      expect(isMonitorBulkEditable(makeMonitor({ serviceManaged: true }), false)).toBe(false);
    });

    it('allows ui monitors on public locations when the user has the permission', () => {
      expect(isMonitorBulkEditable(makeMonitor({ serviceManaged: true }), true)).toBe(true);
    });
  });
});
