/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import * as i18n from './translations';

interface UpdateMissingIndexProps {
  setMissingIndexPatternFlyoutOpen: () => void;
  isTableLoading: boolean;
  numberOfRulesWithMissingIndex: number;
  missingIndexPatternSelected: number;
  numberOfSelectedRules: number;
}
export const UpdateMissingIndex = ({
  setMissingIndexPatternFlyoutOpen,
  isTableLoading,
  numberOfRulesWithMissingIndex,
  missingIndexPatternSelected,
  numberOfSelectedRules,
}: UpdateMissingIndexProps) => {
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
};
