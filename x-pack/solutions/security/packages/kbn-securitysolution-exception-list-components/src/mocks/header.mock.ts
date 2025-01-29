/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const handleEdit = jest.fn();
export const handleDelete = jest.fn();
export const actions = [
  {
    key: 'edit',
    icon: 'pencil',
    label: 'Edit detection exception',
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    label: 'Delete detection exception',
    onClick: handleDelete,
  },
];
export const actionsWithDisabledDelete = [
  {
    key: 'edit',
    icon: 'pencil',
    label: 'Edit detection exception',
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    disabled: true,
    label: 'Delete detection exception',
    onClick: handleDelete,
  },
];
