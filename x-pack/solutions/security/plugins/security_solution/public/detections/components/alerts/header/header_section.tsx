/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';

const BUTTON_MANAGE_RULES = i18n.translate('xpack.securitySolution.alertsPage.buttonManageRules', {
  defaultMessage: 'Manage rules',
});

export const GO_TO_RULES_BUTTON_TEST_ID = 'alerts-page-manage-alert-detection-rules';

/**
 * UI section of the alerts page that renders a button to navigate to the rules page.
 * Assignees filter is rendered in the filter bar (FiltersSection prependControls).
 */
export const HeaderSection = memo(() => {
  return (
    <SecuritySolutionLinkButton
      deepLinkId={SecurityPageName.rules}
      data-test-subj={GO_TO_RULES_BUTTON_TEST_ID}
      fill
    >
      {BUTTON_MANAGE_RULES}
    </SecuritySolutionLinkButton>
  );
});

HeaderSection.displayName = 'HeaderSection';
