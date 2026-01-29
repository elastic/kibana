/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { MigrationTranslationResult as MigrationTranslationResultType } from '../../../../../common/siem_migrations/model/common.gen';
import * as i18n from './translations';

const COLORS = {
  [MigrationTranslationResult.FULL]: '#54B399',
  [MigrationTranslationResult.PARTIAL]: '#D6BF57',
  [MigrationTranslationResult.UNTRANSLATABLE]: '#DA8B45',
  error: '#E7664C',
} as const;

export const useResultVisColors = () => COLORS;

export const convertTranslationResultIntoColor = (status?: MigrationTranslationResultType) => {
  switch (status) {
    case MigrationTranslationResult.FULL:
      return COLORS[MigrationTranslationResult.FULL];
    case MigrationTranslationResult.PARTIAL:
      return COLORS[MigrationTranslationResult.PARTIAL];
    case MigrationTranslationResult.UNTRANSLATABLE:
      return COLORS[MigrationTranslationResult.UNTRANSLATABLE];
    default:
      return 'subdued';
  }
};

export const convertTranslationResultIntoText = (status?: MigrationTranslationResultType) => {
  switch (status) {
    case MigrationTranslationResult.FULL:
      return i18n.SIEM_TRANSLATION_RESULT_FULL_LABEL;
    case MigrationTranslationResult.PARTIAL:
      return i18n.SIEM_TRANSLATION_RESULT_PARTIAL_LABEL;
    case MigrationTranslationResult.UNTRANSLATABLE:
      return i18n.SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL;
    default:
      return i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL;
  }
};
