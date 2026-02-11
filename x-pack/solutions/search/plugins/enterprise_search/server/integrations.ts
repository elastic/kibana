/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { i18n } from '@kbn/i18n';

import type { ConfigType } from '.';

export const registerEnterpriseSearchIntegrations = (
  config: ConfigType,
  customIntegrations: CustomIntegrationsPluginSetup,
  crawlerAssetBasePath: string
) => {
  if (config.hasWebCrawler) {
    customIntegrations.registerCustomIntegration({
      id: 'web_crawler',
      title: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerName', {
        defaultMessage: 'Web Crawler',
      }),
      description: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerDescription', {
        defaultMessage: 'Add search to your website with the web crawler.',
      }),
      categories: ['search', 'web', 'elastic_stack', 'crawler'],
      uiInternalPath: '/app/elasticsearch/content/crawlers',
      icons: [
        {
          type: 'svg',
          src: crawlerAssetBasePath,
        },
      ],
      shipper: 'search',
      isBeta: false,
    });
  }
};
