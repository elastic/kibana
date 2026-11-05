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
  /** Called once the entity is attached to a case. */
  onSuccess?: () => void;
  ['data-test-subj']?: string;
}

/** Returns a handler that closes the action menu and opens the case selector for an entity. */
const useAddToCase = ({ entity, onClick, onSuccess }: AddToCaseProps) => {
  const { cases } = useKibana().services;
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({ onSuccess });

  return useCallback(() => {
    onClick();
    selectCaseModal.open({ getAttachments: () => generateEntityAttachmentsWithoutOwner(entity) });
  }, [entity, onClick, selectCaseModal]);
};

/** Renders an action that attaches an entity to a new or existing case. */
export const AddToCase: FC<AddToCaseProps> = ({
  entity,
  onClick,
  onSuccess,
  'data-test-subj': dataTestSubj,
}) => {
  const handleClick = useAddToCase({ entity, onClick, onSuccess });

  return (
    <EuiContextMenuItem data-test-subj={dataTestSubj} icon="briefcase" onClick={handleClick}>
      {ADD_TO_CASE}
    </EuiContextMenuItem>
  );
};
