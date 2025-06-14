/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectsImporter, SavedObject } from '@kbn/core-saved-objects-server';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import type { BulkError } from '../../../../routes/utils';

export interface ImportRuleActionConnectorsResult {
  success: boolean;
  successCount: number;
  errors: BulkError[] | [];
  warnings: WarningSchema[] | [];
}

export interface ImportRuleActionConnectorsParams {
  actionConnectors: SavedObject[];
  actionsImporter: ISavedObjectsImporter;
  overwrite: boolean;
}
