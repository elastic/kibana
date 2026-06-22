/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useEntityCasePermissions } from '../hooks/use_case_permission';
import type { EntityToAttach } from '..';
import { generateEntityAttachmentsWithoutOwner } from '..';
import { useKibana } from '../../../../common/lib/kibana';

export interface AddToExistingCaseProps {
  /**
   * Entity used to generate an attachment to an existing case.
   */
  entity: EntityToAttach;
  /**
   * Click event to close the popover in the parent component.
   */
  onClick: () => void;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Leverages the cases plugin api to display a modal listing all the existing cases.
 * Once a case is selected, an entity attachment is added to it and a confirmation
 * snackbar presents a link to view the case.
 *
 * Renders an {@link EuiContextMenuItem}.
 */
export const AddToExistingCase: FC<AddToExistingCaseProps> = ({
  entity,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const { cases } = useKibana().services;
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  const attachments: CaseAttachmentsWithoutOwner = generateEntityAttachmentsWithoutOwner(entity);
  const { canAddToExistingCase } = useEntityCasePermissions();

  const menuItemClicked = useCallback(() => {
    onClick();
    selectCaseModal.open({ getAttachments: () => attachments });
  }, [attachments, onClick, selectCaseModal]);

  const disabled: boolean = !entity.name || !canAddToExistingCase;

  return (
    <EuiContextMenuItem onClick={menuItemClicked} data-test-subj={dataTestSubj} disabled={disabled}>
      <FormattedMessage
        defaultMessage="Add to existing case"
        id="xpack.securitySolution.entityAnalytics.cases.addToExistingCase"
      />
    </EuiContextMenuItem>
  );
};
