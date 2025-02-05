/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutateAsyncFunction } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import type { BulkAction, BulkActionResponse } from '../../../../rule_management/logic';
import { performBulkAction } from '../../../../rule_management/logic';
import { processDryRunResult } from './utils/dry_run_result';

import type { DryRunResult } from './types';

const BULK_ACTIONS_DRY_RUN_QUERY_KEY = 'bulkActionsDryRun';

export type ExecuteBulkActionsDryRun = UseMutateAsyncFunction<
  DryRunResult | undefined,
  unknown,
  BulkAction
>;

export type UseBulkActionsDryRun = () => {
  bulkActionsDryRunResult?: DryRunResult;
  isBulkActionsDryRunLoading: boolean;
  executeBulkActionsDryRun: ExecuteBulkActionsDryRun;
};

export const useBulkActionsDryRun: UseBulkActionsDryRun = () => {
  const { data, mutateAsync, isLoading } = useMutation<
    DryRunResult | undefined,
    unknown,
    BulkAction
  >([BULK_ACTIONS_DRY_RUN_QUERY_KEY], async (bulkAction) => {
    let result: BulkActionResponse;

    try {
      result = await performBulkAction({ bulkAction, dryRun: true });
    } catch (err) {
      // if body doesn't have summary data, action failed altogether and no data available for dry run
      if ((err.body as BulkActionResponse)?.attributes?.summary?.total === undefined) {
        return;
      }
      result = err.body;
    }

    return processDryRunResult(result);
  });

  return {
    bulkActionsDryRunResult: data,
    isBulkActionsDryRunLoading: isLoading,
    executeBulkActionsDryRun: mutateAsync,
  };
};
