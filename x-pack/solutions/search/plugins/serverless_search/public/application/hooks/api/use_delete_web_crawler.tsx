/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { WEB_CRAWLERS_API_PATH } from '../../../../common/types/web_crawlers';
import { useKibanaServices } from '../use_kibana';
import { WEB_CRAWLERS_QUERY_KEY } from './use_web_crawlers';

export const useDeleteWebCrawler = (onSuccess?: () => void) => {
  const { http } = useKibanaServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete(`${WEB_CRAWLERS_API_PATH}/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEB_CRAWLERS_QUERY_KEY });
      onSuccess?.();
    },
  });
};
