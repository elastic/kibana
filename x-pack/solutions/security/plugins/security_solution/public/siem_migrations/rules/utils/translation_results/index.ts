/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { RuleTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationTranslationResult } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';

const COLORS = {
  [RuleTranslationResult.FULL]: '#54B399',
  [RuleTranslationResult.PARTIAL]: '#D6BF57',
  [RuleTranslationResult.UNTRANSLATABLE]: '#DA8B45',
  error: '#E7664C',
} as const;

export const useResultVisColors = () => {
  const { euiTheme } = useEuiTheme();
  if (euiTheme.themeName === 'EUI_THEME_AMSTERDAM') {
    return {
      [RuleTranslationResult.FULL]: euiTheme.colors.vis.euiColorVis0,
      [RuleTranslationResult.PARTIAL]: euiTheme.colors.vis.euiColorVis5,
      [RuleTranslationResult.UNTRANSLATABLE]: euiTheme.colors.vis.euiColorVis7,
      error: euiTheme.colors.vis.euiColorVis9,
    };
  }
  // Borealis
  return COLORS;
};

export const convertTranslationResultIntoColor = (status?: RuleMigrationTranslationResult) => {
  switch (status) {
    case RuleTranslationResult.FULL:
      return COLORS[RuleTranslationResult.FULL];
    case RuleTranslationResult.PARTIAL:
      return COLORS[RuleTranslationResult.PARTIAL];
    case RuleTranslationResult.UNTRANSLATABLE:
      return COLORS[RuleTranslationResult.UNTRANSLATABLE];
    default:
      return 'subdued';
  }
};

export const convertTranslationResultIntoText = (status?: RuleMigrationTranslationResult) => {
  switch (status) {
    case RuleTranslationResult.FULL:
      return i18n.SIEM_TRANSLATION_RESULT_FULL_LABEL;
    case RuleTranslationResult.PARTIAL:
      return i18n.SIEM_TRANSLATION_RESULT_PARTIAL_LABEL;
    case RuleTranslationResult.UNTRANSLATABLE:
      return i18n.SIEM_TRANSLATION_RESULT_UNTRANSLATABLE_LABEL;
    default:
      return i18n.SIEM_TRANSLATION_RESULT_UNKNOWN_LABEL;
  }
};
