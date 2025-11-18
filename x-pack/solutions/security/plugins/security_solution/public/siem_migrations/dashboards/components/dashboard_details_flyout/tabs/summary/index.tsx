/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import * as i18n from '../../../../../common/components/details_flyout/translation';
import { SummaryTabBase } from '../../../../../common/components/details_flyout/tabs/summary';
import type { DashboardMigrationDashboard } from '../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';

interface SummaryTabProps {
  migrationDashboard: DashboardMigrationDashboard;
}

export const SummaryTab: React.FC<SummaryTabProps> = React.memo(({ migrationDashboard }) => {
  const getEventDetails = useCallback(
    () =>
      migrationDashboard.translation_result === MigrationTranslationResult.UNTRANSLATABLE
        ? i18n.COMMENT_EVENT_UNTRANSLATABLE
        : i18n.COMMENT_EVENT_TRANSLATED,
    [migrationDashboard.translation_result]
  );

  return (
    <SummaryTabBase comments={migrationDashboard.comments} getEventDetails={getEventDetails} />
  );
});
SummaryTab.displayName = 'SummaryTab';
