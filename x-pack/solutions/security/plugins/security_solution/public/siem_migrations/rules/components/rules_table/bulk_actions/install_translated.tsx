/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiButton } from '@elastic/eui';
import * as i18n from './translations';

interface InstallTranslatedButtonProps {
  numberOfTranslatedRules: number;
  installTranslatedRule: () => void;
  isTableLoading: boolean;
  numberOfSelectedRules: number;
  disableInstallTranslatedRulesButton: boolean;
  installSelectedRule: () => void;
  installTranslatedRulesSelected: number;
}

export const InstallTranslatedButton = ({
  numberOfTranslatedRules,
  installTranslatedRule,
  isTableLoading,
  numberOfSelectedRules,
  disableInstallTranslatedRulesButton,
  installSelectedRule,
  installTranslatedRulesSelected,
}: InstallTranslatedButtonProps) => {
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
};
