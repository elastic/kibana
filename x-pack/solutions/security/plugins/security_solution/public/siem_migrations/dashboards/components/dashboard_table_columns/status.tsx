/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { StatusBadge } from '../status_badge';
import { TableHeader } from '../../../common/components';
import { convertTranslationResultIntoText } from '../../../common/utils/translation_results';

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
            id="xpack.securitySolution.siemMigrations.dashboards.tableColumn.statusTooltip"
            defaultMessage={`{title}
            {installed} - already added to Dashboards with a tag of “Migrated from Splunk”.{lineBreak}
            {translated} - ready to install. This dashboard was translated by AI.{lineBreak}
            {partiallyTranslated} - part of the dashboard could not be translated.{lineBreak}
            {notTranslated} - none of the original dashboard could be translated.`}
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
              translated: (
                <b>{convertTranslationResultIntoText(MigrationTranslationResult.FULL)}</b>
              ),
              partiallyTranslated: (
                <b>{convertTranslationResultIntoText(MigrationTranslationResult.PARTIAL)}</b>
              ),
              notTranslated: (
                <b>{convertTranslationResultIntoText(MigrationTranslationResult.UNTRANSLATABLE)}</b>
              ),
            }}
          />
        }
      />
    ),
    render: (_, dashboard: DashboardMigrationDashboard) => (
      <StatusBadge
        data-test-subj={`translationStatus-${dashboard.translation_result ?? dashboard.status}`}
        dashboard={dashboard}
      />
    ),
    sortable: true,
    truncateText: true,
    width: '15%',
    align: 'left',
  };
};
