/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StatusResponse } from '@kbn/sample-data-ingest/common';
import { useQuery } from '@kbn/react-query';
import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { QueryKeys } from '../constants';
import { useKibana } from './use_kibana';

const REFRESH_INTERVAL = 5000;

export const useSampleDataStatus = () => {
  const {
    sampleDataIngest,
    notifications: { toasts },
  } = useKibana().services;
  const prevStatus = useRef<string | undefined>();

  const { data, isLoading, refetch } = useQuery<StatusResponse>({
    queryKey: [QueryKeys.FetchSampleDataStatus],
    queryFn: () => sampleDataIngest!.getStatus(),
    enabled: Boolean(sampleDataIngest?.getStatus),
    refetchInterval: (responseData) =>
      responseData?.status === 'installing' ? REFRESH_INTERVAL : false,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (prevStatus.current === 'installing' && data?.status === 'installed') {
      toasts.addSuccess(
        i18n.translate('xpack.searchHomepage.sampleData.successInstallNotification', {
          defaultMessage: 'The Sample Data was successfully installed',
        })
      );
    }

    if (prevStatus.current === 'installing' && data?.status === 'error') {
      toasts?.addError(new Error('Failed to install the Sample Data.'), {
        title: i18n.translate('xpack.searchHomepage.sampleData.errorNotification', {
          defaultMessage: 'Something went wrong while installing the Sample Data',
        }),
      });
    }

    prevStatus.current = data?.status;
  }, [data?.status, toasts]);

  return {
    isInstalled: data?.status === 'installed',
    isInstalling: data?.status === 'installing',
    indexName: data?.indexName,
    dashboardId: data?.dashboardId,
    isLoading,
    refetch,
  };
};
