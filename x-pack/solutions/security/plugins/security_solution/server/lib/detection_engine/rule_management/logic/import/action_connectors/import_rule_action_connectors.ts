/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import { isBoom } from '@hapi/boom';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';

import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import { mapSOErrorsToBulkErrors } from './utils';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';
import { createBulkErrorObject } from '../../../../routes/utils';

const NO_ACTION_RESULT = {
  success: true,
  errors: [],
  successCount: 0,
  warnings: [],
};

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsImporter,
  overwrite,
}: ImportRuleActionConnectorsParams): Promise<ImportRuleActionConnectorsResult> => {
  try {
    if (!actionConnectors.length) {
      return NO_ACTION_RESULT;
    }

    const readStream = Readable.from(actionConnectors);
    const { success, successCount, warnings, errors }: SavedObjectsImportResponse =
      await actionsImporter.import({
        readStream,
        overwrite,
        createNewCopies: false,
      });

    return {
      success,
      successCount,
      errors: errors ? mapSOErrorsToBulkErrors(errors) : [],
      warnings: (warnings as WarningSchema[]) || [],
    };
  } catch (exc) {
    if (isBoom(exc) && exc.output.statusCode === 403) {
      return {
        success: false,
        successCount: 0,
        errors: [
          createBulkErrorObject({
            statusCode: 403,
            message: `You may not have actions privileges required to import actions: ${exc.output.payload.message}`,
          }),
        ],
        warnings: [],
      };
    } else {
      throw exc;
    }
  }
};
