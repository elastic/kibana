/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CrawlerStatus } from '../api/crawler/types';
import {
  crawlStatusColors,
  readableCrawlerStatuses,
} from '../components/search_index/crawler/crawl_requests_panel/constants';

export function crawlerStatusToText(crawlerStatus?: CrawlerStatus): string {
  return crawlerStatus
    ? readableCrawlerStatuses[crawlerStatus]
    : i18n.translate('xpack.enterpriseSearch.content.searchIndices.ingestionStatus.idle.label', {
        defaultMessage: 'Idle',
      });
}

export function crawlerStatusToColor(
  crawlerStatus?: CrawlerStatus
): 'default' | 'danger' | 'success' {
  return crawlerStatus ? crawlStatusColors[crawlerStatus] : 'default';
}
