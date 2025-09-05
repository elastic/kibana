/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useMemo, memo } from 'react';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import * as i18n from './translations';
import { WithMissingPrivilegesTooltip } from '../../missing_privileges';
import { SiemMigrationStatus } from '../../../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

interface ReprocessFailedRulesButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  isAuthorized: boolean;
  translationStats: GetRuleMigrationTranslationStatsResponse;
  selectedRules: RuleMigrationRule[];
}

const ReprocessFailedRulesButtonComp = memo(function ReprocessFailedRulesButton({
  onClick,
  isLoading = false,
  isDisabled = false,
  isAuthorized,
  translationStats,
  selectedRules,
}: ReprocessFailedRulesButtonProps) {
  const numberOfFailedRules = translationStats.rules.failed;
  const numberOfFailedRulesSelected = useMemo(
    () => selectedRules.filter((rule) => rule.status === SiemMigrationStatus.FAILED).length,
    [selectedRules]
  );
  const isSelected = numberOfFailedRulesSelected > 0;
  return (
    <EuiButton
      iconType="refresh"
      color={'warning'}
      onClick={onClick}
      disabled={isDisabled || !isAuthorized}
      isLoading={isLoading}
      data-test-subj="reprocessFailedRulesButton"
      aria-label={i18n.REPROCESS_FAILED_ARIA_LABEL}
    >
      {isSelected
        ? i18n.REPROCESS_FAILED_SELECTED_RULES(numberOfFailedRulesSelected)
        : i18n.REPROCESS_FAILED_RULES(numberOfFailedRules)}
    </EuiButton>
  );
});

ReprocessFailedRulesButtonComp.displayName = 'ReprocessFailedRulesButton';

export const ReprocessFailedRulesButton = WithMissingPrivilegesTooltip(
  ReprocessFailedRulesButtonComp,
  'all'
);
