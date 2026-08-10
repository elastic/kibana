/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AddToCaseContextMenuItem } from '@kbn/response-ops-alerts-table';
import type { Indicator } from '../../../../../common/threat_intelligence/types/indicator';
import {
  ADD_TO_EXISTING_CASE,
  useAddToExistingCase,
} from './add_to_existing_case';
import { ADD_TO_NEW_CASE, useAddToNewCase } from './add_to_new_case';

interface IndicatorAddToCaseContextMenuItemProps {
  indicator: Indicator;
  onClick: () => void;
  addToNewCaseTestSubj: string;
  addToExistingCaseTestSubj: string;
}

export const IndicatorAddToCaseContextMenuItem = ({
  indicator,
  onClick,
  addToNewCaseTestSubj,
  addToExistingCaseTestSubj,
}: IndicatorAddToCaseContextMenuItemProps) => {
  const addToNewCase = useAddToNewCase({ indicator, onClick });
  const addToExistingCase = useAddToExistingCase({ indicator, onClick });

  return (
    <AddToCaseContextMenuItem
      actions={[
        {
          id: 'addToNewCase',
          label: ADD_TO_NEW_CASE,
          dataTestSubj: addToNewCaseTestSubj,
          disabled: addToNewCase.disabled,
          onClick: addToNewCase.onClick,
        },
        {
          id: 'addToExistingCase',
          label: ADD_TO_EXISTING_CASE,
          dataTestSubj: addToExistingCaseTestSubj,
          disabled: addToExistingCase.disabled,
          onClick: addToExistingCase.onClick,
        },
      ]}
    />
  );
};

