/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, memo } from 'react';
import { EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';

interface InstallTranslatedButtonProps {
  installTranslatedRule: () => void;
  isTableLoading: boolean;
  disableInstallTranslatedRulesButton: boolean;
  installSelectedRule: () => void;
  translationStats: GetRuleMigrationTranslationStatsResponse;
  selectedRules: RuleMigrationRule[];
}

export const InstallTranslatedButton = memo(
  ({
    installTranslatedRule,
    isTableLoading,
    disableInstallTranslatedRulesButton,
    installSelectedRule,
    translationStats,
    selectedRules,
  }: InstallTranslatedButtonProps) => {
    const numberOfTranslatedRules = translationStats.rules.success.installable;
    const numberOfSelectedRules = selectedRules.length;
    const installTranslatedRulesSelected = useMemo(
      () =>
        selectedRules.filter((rule) => rule.translation_result === MigrationTranslationResult.FULL)
          .length,
      [selectedRules]
    );
    const isSelected = installTranslatedRulesSelected > 0;
    const onClick = useCallback(() => {
      if (numberOfSelectedRules === 0) {
        installTranslatedRule?.();
      } else {
        installSelectedRule?.();
      }
    }, [numberOfSelectedRules, installTranslatedRule, installSelectedRule]);

    let buttonText = i18n.INSTALL_TRANSLATED_RULES_EMPTY_STATE;
    if (numberOfSelectedRules > 0) {
      buttonText = i18n.INSTALL_SELECTED_RULES(
        isSelected ? installTranslatedRulesSelected : numberOfSelectedRules
      );
    } else if (numberOfTranslatedRules > 0) {
      buttonText = i18n.INSTALL_TRANSLATED_RULES(
        isSelected ? installTranslatedRulesSelected : numberOfTranslatedRules
      );
    }

    const ariaLabel =
      numberOfSelectedRules === 0
        ? i18n.INSTALL_TRANSLATED_ARIA_LABEL
        : i18n.INSTALL_SELECTED_ARIA_LABEL;

    const dataTestSubj =
      numberOfSelectedRules === 0 ? 'installTranslatedRulesButton' : 'installSelectedRulesButton';

    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="plusInCircle"
          onClick={onClick}
          disabled={disableInstallTranslatedRulesButton}
          isLoading={isTableLoading}
          data-test-subj={dataTestSubj}
          aria-label={ariaLabel}
        >
          {buttonText}
        </EuiButton>
      </EuiFlexItem>
    );
  }
);
InstallTranslatedButton.displayName = 'InstallTranslatedButton';
