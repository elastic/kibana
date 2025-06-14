/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { RuleTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { StatusBadge } from '../status_badge';
import { TableHeader } from './header';
import { convertTranslationResultIntoText } from '../../utils/translation_results';

export const SIEM_MIGRATIONS_STATUS_HEADER_ID = 'siemMigrationsStatusHeader';

export const createStatusColumn = (): TableColumn => {
  return {
    field: 'translation_result',
    name: (
      <TableHeader
        id={SIEM_MIGRATIONS_STATUS_HEADER_ID}
        title={i18n.COLUMN_STATUS}
        tooltipContent={
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.tableColumn.statusTooltip"
            defaultMessage={`{title}
            {installed} - already added to Elastic SIEM. Click "View" to manage and enable it.{lineBreak}
            {translated} - ready to install. This rule was mapped to an Elastic Authored rule if possible, or translated by AI.{lineBreak}
            {partiallyTranslated} - part of the query could not be translated. Upload any missing macros or lookups and check your syntax.{lineBreak}
            {notTranslated} - none of the original query could be translated.`}
            values={{
              lineBreak: <br />,
              title: (
                <EuiText size="s">
                  <p>
                    <b>{i18n.STATUS_TOOLTIP_TITLE}</b>
                    <EuiHorizontalRule margin="s" />
                  </p>
                </EuiText>
              ),
              installed: <b>{i18n.INSTALLED_STATUS_TITLE}</b>,
              translated: <b>{convertTranslationResultIntoText(RuleTranslationResult.FULL)}</b>,
              partiallyTranslated: (
                <b>{convertTranslationResultIntoText(RuleTranslationResult.PARTIAL)}</b>
              ),
              notTranslated: (
                <b>{convertTranslationResultIntoText(RuleTranslationResult.UNTRANSLATABLE)}</b>
              ),
            }}
          />
        }
      />
    ),
    render: (_, rule: RuleMigrationRule) => (
      <StatusBadge
        data-test-subj={`translationStatus-${rule.translation_result ?? rule.status}`}
        migrationRule={rule}
      />
    ),
    sortable: true,
    truncateText: true,
    width: '15%',
  };
};
