/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';
import { isMigrationItemNavigableWithFlyout } from './is_migration_item_navigable_with_flyout';

describe('isMigrationItemNavigableWithFlyout', () => {
  it('should return false for failed items', () => {
    expect(isMigrationItemNavigableWithFlyout({ status: SiemMigrationStatus.FAILED })).toBe(false);
  });

  it.each([
    SiemMigrationStatus.PENDING,
    SiemMigrationStatus.PROCESSING,
    SiemMigrationStatus.COMPLETED,
  ])('should return true for %s items', (status) => {
    expect(isMigrationItemNavigableWithFlyout({ status })).toBe(true);
  });
});
