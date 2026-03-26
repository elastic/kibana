/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import type { RuleMigrationRuleData } from '@kbn/security-solution-plugin/common/siem_migrations/model/rule_migration.gen';

export const statsOverrideCallbackFactory = ({
  migrationId,
  failed = 0,
  pending = 0,
  processing = 0,
  completed = 0,
  fullyTranslated = 0,
  partiallyTranslated = 0,
}: {
  migrationId: string;
  failed?: number;
  pending?: number;
  processing?: number;
  completed?: number;
  fullyTranslated?: number;
  partiallyTranslated?: number;
}) => {
  const overrideCallback = (
    index: number
  ): Pick<RuleMigrationRuleData, 'migration_id' | 'translation_result' | 'status'> => {
    let translationResult;
    let status = SiemMigrationStatus.PENDING;

    const pendingEndIndex = failed + pending;
    const processingEndIndex = failed + pending + processing;
    const completedEndIndex = failed + pending + processing + completed;
    if (index < failed) {
      status = SiemMigrationStatus.FAILED;
    } else if (index < pendingEndIndex) {
      status = SiemMigrationStatus.PENDING;
    } else if (index < processingEndIndex) {
      status = SiemMigrationStatus.PROCESSING;
    } else if (index < completedEndIndex) {
      status = SiemMigrationStatus.COMPLETED;
      const fullyTranslatedEndIndex = completedEndIndex - completed + fullyTranslated;
      const partiallyTranslatedEndIndex =
        completedEndIndex - completed + fullyTranslated + partiallyTranslated;
      if (index < fullyTranslatedEndIndex) {
        translationResult = MigrationTranslationResult.FULL;
      } else if (index < partiallyTranslatedEndIndex) {
        translationResult = MigrationTranslationResult.PARTIAL;
      } else {
        translationResult = MigrationTranslationResult.UNTRANSLATABLE;
      }
    }
    return {
      migration_id: migrationId,
      translation_result: translationResult,
      status,
    };
  };
  return overrideCallback;
};
