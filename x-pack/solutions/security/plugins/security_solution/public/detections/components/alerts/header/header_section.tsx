/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Dispatch, SetStateAction } from 'react';
import React, { memo, useCallback } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FilterByAssigneesPopover } from '../../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';

const BUTTON_MANAGE_RULES = i18n.translate('xpack.securitySolution.alertsPage.buttonManageRules', {
  defaultMessage: 'Manage rules',
});

export const GO_TO_RULES_BUTTON_TEST_ID = 'alerts-page-manage-alert-detection-rules';

export interface HeaderSectionProps {
  /**
   * List of assignees retrieved from the assignees button on the alert page
   */
  assignees: AssigneesIdsSelection[];
  /**
   * Callback to set the assignees for the alerts page as they're also used in the FilterSection component
   */
  setAssignees: Dispatch<SetStateAction<AssigneesIdsSelection[]>>;
}

/**
 * UI section of the alerts page that renders the assignees button and a button to navigate to the rules page.
 */
export const HeaderSection = memo(({ assignees, setAssignees }: HeaderSectionProps) => {
  const handleSelectedAssignees = useCallback(
    (newAssignees: AssigneesIdsSelection[]) => {
      if (!isEqual(newAssignees, assignees)) {
        setAssignees(newAssignees);
      }
    },
    [assignees, setAssignees]
  );

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <FilterByAssigneesPopover
          selectedUserIds={assignees}
          onSelectionChange={handleSelectedAssignees}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SecuritySolutionLinkButton
          deepLinkId={SecurityPageName.rules}
          data-test-subj={GO_TO_RULES_BUTTON_TEST_ID}
          fill
        >
          {BUTTON_MANAGE_RULES}
        </SecuritySolutionLinkButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HeaderSection.displayName = 'HeaderSection';
