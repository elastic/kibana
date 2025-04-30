/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Oas from 'oas';

export type Operation = ReturnType<Oas['operation']>;
export type OperationOrWebhook = ReturnType<Oas['getOperationById']>;

export const isOperation = (operation: OperationOrWebhook): operation is Operation => {
  return operation.isWebhook() === false;
};

/**
 * Formats the tool name to be a valid identifier.
 */
export const formatToolName = (toolName: string) => {
  return toolName.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, '_');
};
