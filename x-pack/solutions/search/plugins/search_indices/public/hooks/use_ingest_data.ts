/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { InstallResponse } from '@kbn/sample-data-ingest/common';
import { useKibana } from './use_kibana';

import { QueryKeys } from '../constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useIngestSampleData() {
  const {
    sampleDataIngest,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  const { mutate: ingestSampleData, isLoading } = useMutation<InstallResponse, ServerError, void>(
    [QueryKeys.IngestSampleData],
    () => {
      if (!sampleDataIngest) {
        throw new Error(
          i18n.translate('xpack.searchIndices.shared.createIndex.ingestSampleData.notInstalled', {
            defaultMessage: 'Sample Data Ingest plugin is not installed',
          })
        );
      }

      return sampleDataIngest.install();
    },
    {
      onSuccess: () => {
        toasts?.addSuccess(
          i18n.translate(
            'xpack.searchIndices.shared.createIndex.ingestSampleData.successNotification',
            {
              defaultMessage: 'The Sample Data was successfully installed',
            }
          )
        );

        queryClient.invalidateQueries([QueryKeys.FetchSampleDataStatus]);
      },
      onError: (error) => {
        toasts?.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.searchIndices.shared.createIndex.ingestSampleData.errorNotification',
            {
              defaultMessage: 'Something went wrong while installing the Sample Data',
            }
          ),
        });
      },
    }
  );

  return { ingestSampleData, isLoading };
}
