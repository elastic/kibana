/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  filterExistingActionConnectors,
  mapSOErrorToRuleError,
  returnErroredImportResult,
} from './utils';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';

const NO_ACTION_RESULT = {
  success: true,
  errors: [],
  successCount: 0,
  warnings: [],
};

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsClient,
  actionsImporter,
  overwrite,
}: ImportRuleActionConnectorsParams): Promise<ImportRuleActionConnectorsResult> => {
  try {
    let actionConnectorsToImport: SavedObject[] = actionConnectors;

    if (!actionConnectorsToImport.length) {
      return NO_ACTION_RESULT;
    }

    if (!overwrite) {
      actionConnectorsToImport = await filterExistingActionConnectors(
        actionsClient,
        actionConnectors
      );
    }
    if (!actionConnectorsToImport.length) {
      return NO_ACTION_RESULT;
    }

    const readStream = Readable.from(actionConnectorsToImport);
    const { success, successCount, warnings, errors }: SavedObjectsImportResponse =
      await actionsImporter.import({
        readStream,
        overwrite,
        createNewCopies: false,
      });

    return {
      success,
      successCount,
      errors: errors ? mapSOErrorToRuleError(errors) : [],
      warnings: (warnings as WarningSchema[]) || [],
    };
  } catch (error) {
    return returnErroredImportResult(error);
  }
};
