/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

import { CrawlerDomain, CrawlerDomainFromServer } from './types';

import { crawlerDomainServerToClient } from './utils';

export interface GetCrawlerDomainArgs {
  domainId: string;
  indexName: string;
}

export const getCrawlerDomain = async ({
  indexName,
  domainId,
}: GetCrawlerDomainArgs): Promise<CrawlerDomain> => {
  const response = await HttpLogic.values.http.get<CrawlerDomainFromServer>(
    `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}`
  );

  return crawlerDomainServerToClient(response);
};

export const GetCrawlerDomainApiLogic = createApiLogic(['get_crawler_domain'], getCrawlerDomain);
