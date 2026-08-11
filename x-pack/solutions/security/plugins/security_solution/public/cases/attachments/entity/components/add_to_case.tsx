/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityToAttach } from '..';
import { generateEntityAttachmentsWithoutOwner } from '..';
import { useKibana } from '../../../../common/lib/kibana';

export interface AddToCaseProps {
  entity: EntityToAttach;
  onClick: () => void;
  ['data-test-subj']?: string;
}

export const ADD_TO_CASE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.addToCase',
  {
    defaultMessage: 'Add to case',
  }
);

export const useAddToCase = ({ entity, onClick }: AddToCaseProps) => {
  const { cases } = useKibana().services;
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  return useCallback(() => {
    onClick();
    selectCaseModal.open({ getAttachments: () => generateEntityAttachmentsWithoutOwner(entity) });
  }, [entity, onClick, selectCaseModal]);
};

export const AddToCase: FC<AddToCaseProps> = ({
  entity,
  onClick,
  'data-test-subj': dataTestSubj,
}) => {
  const handleClick = useAddToCase({ entity, onClick });

  return (
    <EuiContextMenuItem
      data-test-subj={dataTestSubj}
      icon="briefcase"
      onClick={handleClick}
    >
      {ADD_TO_CASE}
    </EuiContextMenuItem>
  );
};
