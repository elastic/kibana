/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import * as i18n from './translations';

export interface BulkActionsProps {
  isTableLoading: boolean;
  numberOfFailedRules: number;
  numberOfTranslatedRules: number;
  numberOfSelectedRules: number;
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
  reprocessFailedRules?: () => void;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    numberOfFailedRules,
    numberOfTranslatedRules,
    numberOfSelectedRules,
    installTranslatedRule,
    installSelectedRule,
    reprocessFailedRules,
  }) => {
    const disableInstallTranslatedRulesButton = isTableLoading || !numberOfTranslatedRules;
    const showInstallSelectedRulesButton = isTableLoading || numberOfSelectedRules > 0;
    const showRetryFailedRulesButton = isTableLoading || numberOfFailedRules > 0;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {showInstallSelectedRulesButton ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plusInCircle"
              color={'primary'}
              onClick={installSelectedRule}
              disabled={isTableLoading}
              data-test-subj="installSelectedRulesButton"
              aria-label={i18n.INSTALL_SELECTED_ARIA_LABEL}
            >
              {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
              {isTableLoading && <EuiLoadingSpinner size="s" />}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        {showRetryFailedRulesButton ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              color={'warning'}
              data-test-subj="reprocessFailedRulesButton"
              onClick={reprocessFailedRules}
              disabled={isTableLoading}
              aria-label={i18n.REPROCESS_FAILED_ARIA_LABEL}
            >
              {i18n.REPROCESS_FAILED_RULES(numberOfFailedRules)}
              {isTableLoading && <EuiLoadingSpinner size="s" />}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircle"
            data-test-subj="installTranslatedRulesButton"
            onClick={installTranslatedRule}
            disabled={disableInstallTranslatedRulesButton}
            aria-label={i18n.INSTALL_TRANSLATED_ARIA_LABEL}
          >
            {numberOfTranslatedRules > 0
              ? i18n.INSTALL_TRANSLATED_RULES(numberOfTranslatedRules)
              : i18n.INSTALL_TRANSLATED_RULES_EMPTY_STATE}
            {isTableLoading && <EuiLoadingSpinner size="s" />}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
