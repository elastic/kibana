/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import type { BulkExportResponse, QueryOrIds } from '../api';
import { bulkExportRules } from '../api';

export const BULK_ACTION_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_BULK_ACTION];

export const useBulkExportMutation = (
  options?: UseMutationOptions<BulkExportResponse, Error, QueryOrIds>
) => {
  return useMutation<BulkExportResponse, Error, QueryOrIds>(
    (action: QueryOrIds) => bulkExportRules(action),
    {
      ...options,
      mutationKey: BULK_ACTION_MUTATION_KEY,
    }
  );
};
