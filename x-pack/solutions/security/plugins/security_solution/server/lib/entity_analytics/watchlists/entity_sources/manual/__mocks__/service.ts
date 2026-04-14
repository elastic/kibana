/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockAssign = jest.fn();
export const mockUnassign = jest.fn();

export const createManualEntityService = jest.fn(() => ({
  assign: mockAssign,
  unassign: mockUnassign,
}));
