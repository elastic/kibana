/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFormRow, EuiText } from '@elastic/eui';

import { ItemWithAnID } from '../types';

import { InlineEditableTableLogic } from './inline_editable_table_logic';
import { InlineEditableTableColumn } from './types';

interface EditingColumnProps<Item extends ItemWithAnID> {
  column: InlineEditableTableColumn<Item>;
  isLoading?: boolean;
}

export const EditingColumn = <Item extends ItemWithAnID>({
  column,
  isLoading = false,
}: EditingColumnProps<Item>) => {
  const { fieldErrors, rowErrors, editingItemValue } = useValues(InlineEditableTableLogic);
  const { setEditingItemValue } = useActions(InlineEditableTableLogic);

  if (!editingItemValue) return null;

  const fieldError = fieldErrors[column.field];
  const isInvalid = !!fieldError || rowErrors.length > 0;

  return (
    <EuiFormRow
      fullWidth
      helpText={
        fieldError && (
          <EuiText color="danger" size="s">
            {fieldError}
          </EuiText>
        )
      }
      isInvalid={isInvalid}
    >
      <>
        {column.editingRender(
          editingItemValue as Item, // TODO we shouldn't need to cast this?
          (newValue) => {
            setEditingItemValue({
              ...editingItemValue,
              [column.field]: newValue,
            });
          },
          {
            isInvalid,
            isLoading,
          }
        )}
      </>
    </EuiFormRow>
  );
};
