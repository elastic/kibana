/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  CrawlerCustomScheduleClient,
  CrawlerCustomScheduleMappingClient,
} from '../../../../../../../common/types/crawler';
import { createApiLogic } from '../../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../../shared/http';

export interface PostCustomSchedulingArgs {
  indexName: string;
  customScheduling: CrawlerCustomScheduleMappingClient;
}

export const postCrawlerCustomScheduling = async ({
  indexName,
  customScheduling,
}: PostCustomSchedulingArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/custom_scheduling`;
  await HttpLogic.values.http.post<CrawlerCustomScheduleClient>(route, {
    body: JSON.stringify(Object.fromEntries(customScheduling)),
  });
};

export const PostCustomSchedulingApiLogic = createApiLogic(
  ['post_crawler_custom_scheduling_api_logic'],
  postCrawlerCustomScheduling,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.postCrawlerCustomSchedulingSuccess.message',
        {
          defaultMessage: 'Successfully saved crawler custom scheduling.',
        }
      ),
  }
);
