/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { BulkError } from '../../../../../routes/utils';
import { createBulkErrorObject } from '../../../../../routes/utils';

export const mapSOErrorsToBulkErrors = (errors: SavedObjectsImportFailure[]): BulkError[] => {
  return errors.map((error) => mapSOErrorToBulkError(error));
};

export const mapSOErrorToBulkError = (error: SavedObjectsImportFailure): BulkError => {
  switch (error.error.type) {
    case 'conflict':
    case 'ambiguous_conflict':
      return createBulkErrorObject({
        id: error.id,
        statusCode: 409,
        message: `Saved Object already exists`,
      });
    case 'unsupported_type':
      return createBulkErrorObject({
        id: error.id,
        statusCode: 400,
        message: 'Unsupported SO action type',
      });
    case 'missing_references':
      return createBulkErrorObject({
        id: error.id,
        statusCode: 400,
        message: 'Missing SO references',
      });
    case 'unknown':
      return createBulkErrorObject({
        id: error.id,
        statusCode: error.error.statusCode,
        message: `Unknown Saved Object import error: ${error.error.message}`,
      });
  }
};
