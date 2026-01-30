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
import { useCaseDisabled } from '../hooks/use_case_permission';
import type { IndicatorAttachmentMetadata } from '../utils/attachments';
import {
  generateIndicatorAttachmentsMetadata,
  generateIndicatorAttachmentsWithoutOwner,
} from '../utils/attachments';
import { useKibana } from '../../../../common/lib/kibana';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';

export interface AddToExistingCaseProps {
  /**
   * Indicator used to generate an attachment to an existing case
   */
  indicator: Indicator;
  /**
   * Click event to close the popover in the parent component
   */
  onClick: () => void;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Leverages the cases plugin api to display a modal listing all the existing cases.
 * Once a case is selected, an attachment is added to it and a confirmation snackbar
 * presents a link to view the case.
 *
 * This component renders an {@link EuiContextMenu}.
 *
 * @returns add to existing case for a context menu
 */
export const AddToExistingCase: FC<AddToExistingCaseProps> = ({
  indicator,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const { cases } = useKibana().services;
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  const id: string = indicator._id as string;
  const attachmentMetadata: IndicatorAttachmentMetadata =
    generateIndicatorAttachmentsMetadata(indicator);
  const attachments: CaseAttachmentsWithoutOwner = generateIndicatorAttachmentsWithoutOwner(
    id,
    attachmentMetadata
  );
  const menuItemClicked = useCallback(() => {
    onClick();
    selectCaseModal.open({ getAttachments: () => attachments });
  }, [attachments, onClick, selectCaseModal]);

  const disabled: boolean = useCaseDisabled(attachmentMetadata.indicatorName);

  return (
    <EuiContextMenuItem onClick={menuItemClicked} data-test-subj={dataTestSubj} disabled={disabled}>
      <FormattedMessage
        defaultMessage="Add to existing case"
        id="xpack.securitySolution.threatIntelligence.addToExistingCase"
      />
    </EuiContextMenuItem>
  );
};
