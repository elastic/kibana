/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  WEB_CRAWLERS_API_PATH,
  type WebCrawlersListResponse,
} from '../../../../common/types/web_crawlers';
import { useKibanaServices } from '../use_kibana';

export const WEB_CRAWLERS_QUERY_KEY = ['fetchWebCrawlers'];
const REFRESH_INTERVAL_MS = 10_000;

export const useWebCrawlers = () => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: WEB_CRAWLERS_QUERY_KEY,
    queryFn: () => http.fetch<WebCrawlersListResponse>(WEB_CRAWLERS_API_PATH),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
};
