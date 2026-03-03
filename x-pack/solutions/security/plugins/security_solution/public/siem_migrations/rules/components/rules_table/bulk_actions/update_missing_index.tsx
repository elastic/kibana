/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import * as i18n from './translations';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../common/siem_migrations/constants';

interface UpdateMissingIndexProps {
  setMissingIndexPatternFlyoutOpen: () => void;
  isTableLoading: boolean;
  translationStats: GetRuleMigrationTranslationStatsResponse;
  selectedRules: RuleMigrationRule[];
}
export const UpdateMissingIndex = memo(
  ({
    setMissingIndexPatternFlyoutOpen,
    isTableLoading,
    translationStats,
    selectedRules,
  }: UpdateMissingIndexProps) => {
    const numberOfRulesWithMissingIndex = translationStats.rules.success.missing_index;
    const numberOfSelectedRules = selectedRules.length;
    const missingIndexPatternSelected = useMemo(
      () =>
        selectedRules.filter((rule) =>
          rule.elastic_rule?.query?.includes(SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER)
        ).length,
      [selectedRules]
    );
    const onClick = useCallback(() => {
      setMissingIndexPatternFlyoutOpen?.();
    }, [setMissingIndexPatternFlyoutOpen]);

    if (numberOfRulesWithMissingIndex === 0) {
      return null;
    }

    const isSelected = numberOfSelectedRules > 0;
    const isDisabled =
      isTableLoading || (numberOfSelectedRules > 0 && missingIndexPatternSelected === 0);
    const buttonText = isSelected
      ? i18n.UPDATE_MISSING_INDEX_PATTERN_SELECTED_RULES(missingIndexPatternSelected)
      : i18n.UPDATE_MISSING_INDEX_PATTERN(numberOfRulesWithMissingIndex);
    return (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="documentEdit"
          color={'primary'}
          onClick={onClick}
          disabled={isDisabled}
          isLoading={isTableLoading}
          data-test-subj="updateMissingIndexPatternButton"
          aria-label={i18n.UPDATE_MISSING_INDEX_PATTERN_ARIA_LABEL}
        >
          {buttonText}
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  }
);

UpdateMissingIndex.displayName = 'UpdateMissingIndex';
