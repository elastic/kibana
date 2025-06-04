/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useCaseDisabled } from '../hooks/use_case_permission';
import type { AttachmentMetadata } from '../utils/attachments';
import { generateAttachmentsMetadata, generateAttachmentsWithoutOwner } from '../utils/attachments';
import { useKibana } from '../../../../common/lib/kibana';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';

export interface AddToNewCaseProps {
  /**
   * Indicator used to generate an attachment to a new case
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
 * Leverages the cases plugin api to display a flyout to create a new case.
 * Once a case is created, an attachment is added to it and a confirmation snackbar
 * presents a link to view the case.
 *
 * This component renders an {@link EuiContextMenu}.
 *
 * @returns add to existing case for a context menu
 */
export const AddToNewCase: FC<AddToNewCaseProps> = ({
  indicator,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const { cases } = useKibana().services;
  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout();

  const id: string = indicator._id as string;
  const attachmentMetadata: AttachmentMetadata = generateAttachmentsMetadata(indicator);

  const attachments: CaseAttachmentsWithoutOwner = generateAttachmentsWithoutOwner(
    id,
    attachmentMetadata
  );
  const menuItemClicked = () => {
    onClick();
    createCaseFlyout.open({ attachments });
  };

  const disabled: boolean = useCaseDisabled(attachmentMetadata.indicatorName);

  return (
    <EuiContextMenuItem
      key="attachmentsNewCase"
      onClick={() => menuItemClicked()}
      data-test-subj={dataTestSubj}
      disabled={disabled}
    >
      <FormattedMessage
        defaultMessage="Add to new case"
        id="xpack.securitySolution.threatIntelligence.addToNewCase"
      />
    </EuiContextMenuItem>
  );
};
