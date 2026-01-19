/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import { bulkSoftDeleteOperationsFactory } from './soft_delete';

export const createBulkUtilsService = (dataClient: PrivilegeMonitoringDataClient) => {
  const bulkSoftDeleteOperations = bulkSoftDeleteOperationsFactory(dataClient);

  return {
    bulkSoftDeleteOperations,
  };
};
