/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  InlineEditableTable,
  InlineEditableTableProps,
} from '../inline_editable_table/inline_editable_table';
import { ItemWithAnID } from '../types';

import { GenericEndpointInlineEditableTableLogic } from './generic_endpoint_inline_editable_table_logic';

export interface GenericEndpointInlineEditableTableProps
  extends Omit<
    InlineEditableTableProps<ItemWithAnID>,
    'onAdd' | 'onDelete' | 'onUpdate' | 'isLoading' | 'itemId'
  > {
  addRoute: string;
  instanceId: string;
  dataProperty: string;
  deleteRoute(item: ItemWithAnID): string;
  reorderRoute?: string;
  updateRoute(item: ItemWithAnID): string;
  onAdd(item: ItemWithAnID, items: ItemWithAnID[]): void;
  onDelete(item: ItemWithAnID, items: ItemWithAnID[]): void;
  onUpdate(item: ItemWithAnID, items: ItemWithAnID[]): void;
  onReorder?(items: ItemWithAnID[]): void;
  disableReordering?: boolean;
}

export const GenericEndpointInlineEditableTable = ({
  addRoute,
  dataProperty,
  deleteRoute,
  reorderRoute,
  updateRoute,
  onAdd,
  onDelete,
  onReorder,
  onUpdate,
  ...props
}: GenericEndpointInlineEditableTableProps) => {
  const { instanceId } = props;

  const genericEndpointLogic = GenericEndpointInlineEditableTableLogic({
    dataProperty,
    instanceId,
    addRoute,
    deleteRoute,
    reorderRoute,
    updateRoute,
    onAdd,
    onDelete,
    onReorder,
    onUpdate,
  });

  const { isLoading } = useValues(genericEndpointLogic);
  const { addItem, deleteItem, reorderItems, updateItem } = useActions(genericEndpointLogic);

  return (
    <InlineEditableTable
      {...props}
      isLoading={isLoading}
      onAdd={addItem}
      onDelete={deleteItem}
      onReorder={reorderItems}
      onUpdate={updateItem}
    />
  );
};
