/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import type { RuleMigrationRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { type RuleMigrationTranslationResult } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';

type RuleMigrationTranslationCallOutMode = RuleMigrationTranslationResult | 'mapped';

const getCallOutInfo = (
  mode: RuleMigrationTranslationCallOutMode
): { title: string; message?: string; icon: IconType; color: 'success' | 'warning' | 'danger' } => {
  switch (mode) {
    case 'mapped':
      return {
        title: i18n.CALLOUT_MAPPED_TRANSLATED_RULE_TITLE,
        icon: 'checkInCircleFilled',
        color: 'success',
      };
    case 'full':
      return {
        title: i18n.CALLOUT_TRANSLATED_RULE_TITLE,
        icon: 'checkInCircleFilled',
        color: 'success',
      };
    case 'partial':
      return {
        title: i18n.CALLOUT_PARTIALLY_TRANSLATED_RULE_TITLE,
        message: i18n.CALLOUT_PARTIALLY_TRANSLATED_RULE_DESCRIPTION,
        icon: 'warningFilled',
        color: 'warning',
      };
    case 'untranslatable':
      return {
        title: i18n.CALLOUT_NOT_TRANSLATED_RULE_TITLE,
        message: i18n.CALLOUT_NOT_TRANSLATED_RULE_DESCRIPTION,
        icon: 'checkInCircleFilled',
        color: 'danger',
      };
  }
};

export interface TranslationCallOutProps {
  migrationRule: RuleMigrationRule;
}

export const TranslationCallOut: FC<TranslationCallOutProps> = React.memo(({ migrationRule }) => {
  if (!migrationRule.translation_result) {
    return null;
  }

  const mode = migrationRule.elastic_rule?.prebuilt_rule_id
    ? 'mapped'
    : migrationRule.translation_result;
  const { title, message, icon, color } = getCallOutInfo(mode);

  return (
    <EuiCallOut
      color={color}
      title={title}
      iconType={icon}
      size={'s'}
      data-test-subj={`ruleMigrationCallOut-${mode}`}
    >
      {message}
    </EuiCallOut>
  );
});
TranslationCallOut.displayName = 'TranslationCallOut';
