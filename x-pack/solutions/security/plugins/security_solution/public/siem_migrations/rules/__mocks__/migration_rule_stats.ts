/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationTranslationStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { RuleMigrationStats } from '../types';
import { MigrationSource } from '../../common/types';

export const getRuleMigrationStatsMock = (
  overrides?: Partial<RuleMigrationStats>
): RuleMigrationStats => ({
  id: '1',
  name: 'test migration',
  status: SiemMigrationTaskStatus.RUNNING,
  items: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  },
  created_at: '2021-01-01T00:00:00.000Z',
  last_updated_at: '2021-01-01T00:00:00.000Z',
  vendor: MigrationSource.SPLUNK,
  ...overrides,
});

export const getRuleMigrationTranslationStatsMock = (
  overrides?: Partial<RuleMigrationTranslationStats>
): RuleMigrationTranslationStats => {
  return {
    id: '1',
    rules: {
      total: 63,
      success: {
        total: 62,
        result: {
          full: 32,
          partial: 16,
          untranslatable: 14,
        },
        installable: 32,
        prebuilt: 9,
        missing_index: 12,
      },
      failed: 1,
    },
    ...overrides,
  };
};
