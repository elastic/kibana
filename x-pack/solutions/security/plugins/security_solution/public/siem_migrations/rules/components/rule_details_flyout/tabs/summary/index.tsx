/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import * as genericI18n from '../../../../../common/components/details_flyout/translation';
import { type RuleMigrationRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import { SummaryTabBase } from '../../../../../common/components/details_flyout/tabs/summary';

interface SummaryTabProps {
  migrationRule: RuleMigrationRule;
}

export const SummaryTab: React.FC<SummaryTabProps> = React.memo(({ migrationRule }) => {
  const getEventDetails = useCallback(
    () =>
      migrationRule.translation_result === MigrationTranslationResult.UNTRANSLATABLE
        ? genericI18n.COMMENT_EVENT_UNTRANSLATABLE
        : genericI18n.COMMENT_EVENT_TRANSLATED,
    [migrationRule.translation_result]
  );

  return <SummaryTabBase comments={migrationRule.comments} getEventDetails={getEventDetails} />;
});
SummaryTab.displayName = 'SummaryTab';
