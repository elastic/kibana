/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';

export const ALERTS_PAGE_MANAGE_RULES_LABEL = i18n.translate(
  'xpack.securitySolution.alertsPage.buttonManageRules',
  {
    defaultMessage: 'Manage rules',
  }
);

export const GO_TO_RULES_BUTTON_TEST_ID = 'alerts-page-manage-alert-detection-rules';

export interface HeaderSectionProps {
  /**
   * When false, the Manage rules control is not shown in the page header (e.g. shown in project chrome app menu).
   */
  showManageRulesButton?: boolean;
}

/**
 * UI section of the alerts page header (e.g. navigate to the rules page).
 */
export const HeaderSection = memo(({ showManageRulesButton = true }: HeaderSectionProps) => {
  return (
    <EuiFlexGroup gutterSize="m">
      {showManageRulesButton ? (
        <EuiFlexItem>
          <SecuritySolutionLinkButton
            deepLinkId={SecurityPageName.rules}
            data-test-subj={GO_TO_RULES_BUTTON_TEST_ID}
            fill
          >
            {ALERTS_PAGE_MANAGE_RULES_LABEL}
          </SecuritySolutionLinkButton>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
});

HeaderSection.displayName = 'HeaderSection';
