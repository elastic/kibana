/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { RESET_TO_DEFAULT_LABEL } from './translations';

export interface EntityTableResetButtonProps {
  entityType: string;
  onReset: () => void;
}

/** Restores the default columns and sort of a results table. */
export const EntityTableResetButton = ({ entityType, onReset }: EntityTableResetButtonProps) => (
  <EuiButtonEmpty
    size="xs"
    color="text"
    iconType="undo"
    onClick={onReset}
    data-test-subj="entityInventoryTableReset"
    {...getEbtProps({
      action: ENTITY_INVENTORY_EBT_ACTIONS.RESET_TABLE,
      element: ENTITY_INVENTORY_EBT_ELEMENTS.ENTITY_TABLE,
      detail: entityType,
    })}
  >
    {RESET_TO_DEFAULT_LABEL}
  </EuiButtonEmpty>
);
