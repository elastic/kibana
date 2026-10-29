/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  WEB_CRAWLERS_API_PATH,
  type WebCrawler,
  type WebCrawlerConfig,
} from '../../../../common/types/web_crawlers';
import { useKibanaServices } from '../use_kibana';
import { WEB_CRAWLERS_QUERY_KEY } from './use_web_crawlers';

export const useUpdateWebCrawler = (id: string, onSuccess?: (crawler: WebCrawler) => void) => {
  const { http } = useKibanaServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: WebCrawlerConfig) => {
      const result = await http.put<{ crawler: WebCrawler }>(
        `${WEB_CRAWLERS_API_PATH}/${encodeURIComponent(id)}`,
        { body: JSON.stringify(config) }
      );
      return result.crawler;
    },
    onSuccess: (crawler) => {
      queryClient.invalidateQueries({ queryKey: WEB_CRAWLERS_QUERY_KEY });
      onSuccess?.(crawler);
    },
  });
};
