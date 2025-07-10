/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useLogicalAndFields = ['tags', 'locations'] as const;

export type UseLogicalAndField = (typeof useLogicalAndFields)[number];

export const isLogicalAndField = (field: string): field is UseLogicalAndField => {
  return Object.values<string>(useLogicalAndFields).includes(field);
};
