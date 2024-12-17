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

export const useResultVisColors = () => {
  const { euiTheme } = useEuiTheme();
  return {
    [RuleTranslationResult.FULL]: euiTheme.colors.vis.euiColorVis0,
    [RuleTranslationResult.PARTIAL]: euiTheme.colors.vis.euiColorVis5,
    [RuleTranslationResult.UNTRANSLATABLE]: euiTheme.colors.vis.euiColorVis7,
    error: euiTheme.colors.vis.euiColorVis9,
  };
};

export const convertTranslationResultIntoColor = (status?: RuleMigrationTranslationResult) => {
  switch (status) {
    case RuleTranslationResult.FULL:
      return 'primary';
    case RuleTranslationResult.PARTIAL:
      return 'warning';
    case RuleTranslationResult.UNTRANSLATABLE:
      return 'danger';
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
