/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ADD_TO_CASE } from '@kbn/response-ops-alerts-table/translations';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import type { IndicatorAttachmentMetadata } from '..';
import { generateIndicatorAttachmentsMetadata, generateIndicatorAttachmentsWithoutOwner } from '..';
import { useKibana } from '../../../../common/lib/kibana';
import { useCaseDisabled } from '../hooks/use_case_permission';

interface IndicatorAddToCaseContextMenuItemProps {
  /**
   * Indicator to attach to the selected case.
   */
  indicator: Indicator;
  /**
   * Callback invoked before the case selector opens.
   */
  onClick: () => void;
  /**
   * Test subject applied to the context menu item.
   */
  ['data-test-subj']?: string;
}

/**
 * Renders an action that opens the case selector with an attachment generated from the indicator.
 */
export const IndicatorAddToCaseContextMenuItem = ({
  indicator,
  onClick,
  'data-test-subj': dataTestSubj,
}: IndicatorAddToCaseContextMenuItemProps) => {
  const { cases } = useKibana().services;
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();
  const id = indicator._id as string;
  const attachmentMetadata: IndicatorAttachmentMetadata =
    generateIndicatorAttachmentsMetadata(indicator);
  const attachments: CaseAttachmentsWithoutOwner = generateIndicatorAttachmentsWithoutOwner(
    id,
    attachmentMetadata
  );
  const handleClick = useCallback(() => {
    onClick();
    selectCaseModal.open({ getAttachments: () => attachments });
  }, [attachments, onClick, selectCaseModal]);
  const disabled = useCaseDisabled(attachmentMetadata.indicatorName);

  return (
    <EuiContextMenuItem
      data-test-subj={dataTestSubj}
      disabled={disabled}
      icon="briefcase"
      onClick={handleClick}
    >
      {ADD_TO_CASE}
    </EuiContextMenuItem>
  );
};
