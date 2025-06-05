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
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { useFormatUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';

const BUTTON_MANAGE_RULES = i18n.translate('xpack.securitySolution.alertsPage.buttonManageRules', {
  defaultMessage: 'Manage rules',
});

export const GO_TO_RULES_BUTTON_TEST_ID = 'alerts-page-manage-alert-detection-rules';

export interface HeaderSectionProps {
  /**
   *
   */
  assignees: AssigneesIdsSelection[];
  /**
   *
   */
  setAssignees: Dispatch<SetStateAction<AssigneesIdsSelection[]>>;
}

export const HeaderSection = memo(({ assignees, setAssignees }: HeaderSectionProps) => {
  const {
    application: { navigateToUrl },
  } = useKibana().services;
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);

  const handleSelectedAssignees = useCallback(
    (newAssignees: AssigneesIdsSelection[]) => {
      if (!isEqual(newAssignees, assignees)) {
        setAssignees(newAssignees);
      }
    },
    [assignees, setAssignees]
  );

  const goToRules = useCallback(
    (ev: React.MouseEvent) => {
      ev.preventDefault();
      navigateToUrl(formatUrl(getRulesUrl()));
    },
    [formatUrl, navigateToUrl]
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
          onClick={goToRules}
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
