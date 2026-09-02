/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ADD_TO_CASE } from '@kbn/response-ops-alerts-table/translations';
import type { EntityToAttach } from '..';
import { generateEntityAttachmentsWithoutOwner } from '..';
import { useKibana } from '../../../../common/lib/kibana';

export interface AddToCaseProps {
  entity: EntityToAttach;
  onClick: () => void;
  ['data-test-subj']?: string;
}

const useAddToCase = ({ entity, onClick }: AddToCaseProps) => {
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
    <EuiContextMenuItem data-test-subj={dataTestSubj} icon="briefcase" onClick={handleClick}>
      {ADD_TO_CASE}
    </EuiContextMenuItem>
  );
};
