/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleMigrationTranslationResultEnum,
  type RuleMigrationTranslationResult,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';

export const convertTranslationResultIntoColor = (status?: RuleMigrationTranslationResult) => {
  switch (status) {
    case RuleMigrationTranslationResultEnum.full:
      return 'primary';

    case RuleMigrationTranslationResultEnum.partial:
      return 'warning';

    case RuleMigrationTranslationResultEnum.untranslatable:
      return 'danger';

    default:
      throw new Error(i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_ERROR(status));
  }
};

export const convertTranslationResultIntoText = (status?: RuleMigrationTranslationResult) => {
  switch (status) {
    case RuleMigrationTranslationResultEnum.full:
      return i18n.SIEM_TRANSLATION_RESULT_FULL_LABEL;

    case RuleMigrationTranslationResultEnum.partial:
      return i18n.SIEM_TRANSLATION_RESULT_PARTIAL_LABEL;

    case RuleMigrationTranslationResultEnum.untranslatable:
      return i18n.SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL;

    default:
      throw new Error(i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_ERROR(status));
  }
};
