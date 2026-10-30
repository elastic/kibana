/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { WEB_CRAWLERS_API_PATH } from '../../../../common/types/web_crawlers';
import { useKibanaServices } from '../use_kibana';
import { WEB_CRAWLERS_QUERY_KEY } from './use_web_crawlers';

export const useStartCrawl = () => {
  const { http, notifications } = useKibanaServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      http.post<{ action_id: string }>(`${WEB_CRAWLERS_API_PATH}/${encodeURIComponent(id)}/crawl`),
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.serverlessSearch.webCrawlers.startCrawl.successToast', {
          defaultMessage: 'Crawl requested. The status updates once the crawler picks it up.',
        })
      );
      queryClient.invalidateQueries({ queryKey: WEB_CRAWLERS_QUERY_KEY });
    },
    onError: (error: { body?: { message?: string } }) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.serverlessSearch.webCrawlers.startCrawl.errorToast', {
          defaultMessage: 'Could not start the crawl',
        }),
        text: error.body?.message,
      });
    },
  });
};
