/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragDropContextProps,
  EuiDroppableProps,
  EuiDragDropContext,
  EuiDroppable,
} from '@elastic/eui';

interface SortableListProps {
  onDragItem: DragDropContextProps['onDragEnd'];
  children: EuiDroppableProps['children'];
}

export const SortableList = ({ onDragItem, children }: SortableListProps) => {
  return (
    <EuiDragDropContext onDragEnd={onDragItem}>
      <EuiDroppable droppableId="droppable-area" spacing="m">
        {children}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
