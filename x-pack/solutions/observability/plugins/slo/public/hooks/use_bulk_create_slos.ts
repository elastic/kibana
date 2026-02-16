/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

const DEFAULT_BATCH_SIZE = 5;

interface BulkCreateSlosInput {
  slos: Array<Record<string, unknown>>;
  batchSize?: number;
}

export interface BulkCreateResult {
  success: boolean;
  id?: string;
  name: string;
  error?: string;
}

interface BulkCreateSlosResponse {
  results: BulkCreateResult[];
  summary: { total: number; success: number; failure: number };
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  completedSlos: number;
  totalSlos: number;
  successCount: number;
  failureCount: number;
}

export function useBulkCreateSlos() {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const abortRef = useRef(false);

  const mutate = useCallback(
    async (
      input: BulkCreateSlosInput,
      options?: { onSuccess?: (data: BulkCreateSlosResponse) => void }
    ) => {
      const { slos, batchSize = DEFAULT_BATCH_SIZE } = input;

      if (slos.length === 0) return;

      setIsLoading(true);
      abortRef.current = false;

      const batches: Array<Array<Record<string, unknown>>> = [];
      for (let i = 0; i < slos.length; i += batchSize) {
        batches.push(slos.slice(i, i + batchSize));
      }

      const allResults: BulkCreateResult[] = [];
      let totalSuccess = 0;
      let totalFailure = 0;

      setBatchProgress({
        currentBatch: 0,
        totalBatches: batches.length,
        completedSlos: 0,
        totalSlos: slos.length,
        successCount: 0,
        failureCount: 0,
      });

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        if (abortRef.current) break;

        const batch = batches[batchIdx];

        setBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: batches.length,
          completedSlos: allResults.length,
          totalSlos: slos.length,
          successCount: totalSuccess,
          failureCount: totalFailure,
        });

        try {
          const response: BulkCreateSlosResponse = await sloClient.fetch(
            'POST /internal/slo/ai/bulk-create',
            {
              params: {
                body: { slos: batch },
              },
            }
          );

          allResults.push(...response.results);
          totalSuccess += response.summary.success;
          totalFailure += response.summary.failure;

          if (response.summary.success > 0) {
            queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
          }
        } catch (error) {
          const serverError = error as ServerError;
          const batchFailures: BulkCreateResult[] = batch.map((slo) => ({
            success: false,
            name: (slo.name as string) ?? 'Unknown',
            error: serverError.body?.message ?? serverError.message ?? 'Batch request failed',
          }));
          allResults.push(...batchFailures);
          totalFailure += batch.length;
        }
      }

      const aggregated: BulkCreateSlosResponse = {
        results: allResults,
        summary: { total: slos.length, success: totalSuccess, failure: totalFailure },
      };

      setBatchProgress({
        currentBatch: batches.length,
        totalBatches: batches.length,
        completedSlos: slos.length,
        totalSlos: slos.length,
        successCount: totalSuccess,
        failureCount: totalFailure,
      });

      setIsLoading(false);

      if (totalFailure === 0) {
        toasts.addSuccess({
          title: i18n.translate('xpack.slo.bulkCreateSlos.successNotification', {
            defaultMessage:
              'Successfully created {count} {count, plural, one {SLO} other {SLOs}}',
            values: { count: totalSuccess },
          }),
        });
      } else if (totalSuccess > 0) {
        toasts.addWarning({
          title: i18n.translate('xpack.slo.bulkCreateSlos.partialSuccessNotification', {
            defaultMessage:
              'Created {success} of {total} SLOs. {failure} {failure, plural, one {SLO} other {SLOs}} failed.',
            values: { success: totalSuccess, total: slos.length, failure: totalFailure },
          }),
        });
      } else {
        toasts.addDanger({
          title: i18n.translate('xpack.slo.bulkCreateSlos.allFailedNotification', {
            defaultMessage: 'Failed to create all {total} SLOs',
            values: { total: slos.length },
          }),
        });
      }

      if (options?.onSuccess && totalSuccess > 0) {
        options.onSuccess(aggregated);
      }
    },
    [sloClient, queryClient, toasts]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { mutate, isLoading, batchProgress, abort };
}
