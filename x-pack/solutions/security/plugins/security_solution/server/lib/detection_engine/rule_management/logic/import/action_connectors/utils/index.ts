/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkError } from '../../../../../routes/utils';
import { createBulkErrorObject } from '../../../../../routes/utils';
import type { ConflictError, ErrorType, ImportRuleActionConnectorsResult, SOError } from '../types';

export const returnErroredImportResult = (error: ErrorType): ImportRuleActionConnectorsResult => ({
  success: false,
  errors: [handleActionConnectorsErrors(error)],
  successCount: 0,
  warnings: [],
});

export const handleActionConnectorsErrors = (error: ErrorType, id?: string): BulkError => {
  let statusCode: number | null = null;
  let message: string = '';
  if ('output' in error) {
    statusCode = (error as SOError).output.statusCode;
    message = (error as SOError).output.payload?.message;
  }
  switch (statusCode) {
    case null:
      return createBulkErrorObject({
        statusCode: 500,
        message:
          (error as ConflictError)?.type === 'conflict'
            ? 'There is a conflict'
            : (error as Error).message
            ? (error as Error).message
            : '',
      });

    case 403:
      return createBulkErrorObject({
        id,
        statusCode,
        message: `You may not have actions privileges required to import rules with actions: ${message}`,
      });

    default:
      return createBulkErrorObject({
        id,
        statusCode,
        message,
      });
  }
};

export const mapSOErrorToRuleError = (errors: SavedObjectsImportFailure[]): BulkError[] => {
  return errors.map(({ id, error }) => handleActionConnectorsErrors(error, id));
};

export const filterExistingActionConnectors = async (
  actionsClient: ActionsClient,
  actions: Array<SavedObject<unknown>>
) => {
  const storedConnectors = await actionsClient.getAll();
  const storedActionIds: string[] = storedConnectors.map(({ id }) => id);
  return actions.filter(({ id }) => !storedActionIds.includes(id));
};
