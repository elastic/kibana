/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import {
  ENTERPRISE_SEARCH_APP_ID,
  ENTERPRISE_SEARCH_CONTENT_APP_ID,
  ENTERPRISE_SEARCH_APPLICATIONS_APP_ID,
  ENTERPRISE_SEARCH_ANALYTICS_APP_ID,
  SEARCH_HOMEPAGE,
  SEARCH_INDICES,
  SEARCH_INDICES_START,
  SEARCH_INDEX_MANAGEMENT,
} from '@kbn/deeplinks-search';
import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '@kbn/search-connectors';

import { ProductFeatures } from './types';

export const SEARCH_PRODUCT_NAME = i18n.translate('xpack.enterpriseSearch.search.productName', {
  defaultMessage: 'Elasticsearch',
});
export const ENTERPRISE_SEARCH_PRODUCT_NAME = i18n.translate('xpack.enterpriseSearch.productName', {
  defaultMessage: 'Enterprise Search',
});

export { SEARCH_INDICES_START, SEARCH_INDICES, SEARCH_INDEX_MANAGEMENT, SEARCH_HOMEPAGE };

export const ENTERPRISE_SEARCH_HOME_PLUGIN = {
  ID: ENTERPRISE_SEARCH_APP_ID,
  NAME: SEARCH_PRODUCT_NAME,
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.home.navTitle', {
    defaultMessage: 'Home',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.home.description', {
    defaultMessage: 'Create search experiences with a refined set of APIs and tools.',
  }),
  URL: '/app/elasticsearch/overview',
  LOGO: 'logoElasticsearch',
};

export const ENTERPRISE_SEARCH_DATA_PLUGIN = {
  ID: ENTERPRISE_SEARCH_CONTENT_APP_ID,
  NAME: SEARCH_PRODUCT_NAME,
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.build.navTitle', {
    defaultMessage: 'Build',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.data.description', {
    defaultMessage:
      'Enterprise search offers a number of ways to easily make your data searchable. Choose from the web crawler, Elasticsearch indices, API, direct uploads, or thrid party connectors.', // TODO: Make sure this content is correct.
  }),
  URL: '/app/elasticsearch/content',
  LOGO: 'logoElasticsearch',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
};

export const ANALYTICS_PLUGIN = {
  ID: ENTERPRISE_SEARCH_ANALYTICS_APP_ID,
  NAME: i18n.translate('xpack.enterpriseSearch.analytics.productName', {
    defaultMessage: 'Behavioral Analytics',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.analytics.productDescription', {
    defaultMessage:
      'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications.',
  }),
  CARD_DESCRIPTION: i18n.translate('xpack.enterpriseSearch.analytics.productCardDescription', {
    defaultMessage:
      'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications.',
  }),
  URL: '/app/elasticsearch/analytics',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
};

export const SEARCH_EXPERIENCES_PLUGIN = {
  ID: 'searchExperiences',
  NAME: i18n.translate('xpack.enterpriseSearch.searchExperiences.productName', {
    defaultMessage: 'Search Experiences',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.searchExperiences.navTitle', {
    defaultMessage: 'Search Experiences',
  }),
  DESCRIPTION: i18n.translate('xpack.enterpriseSearch.searchExperiences.productDescription', {
    defaultMessage: 'Build an intuitive, engaging search experience without reinventing the wheel.',
  }),
  URL: '/app/enterprise_search/search_experiences',
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
  GITHUB_URL: 'https://github.com/elastic/search-ui/',
  DOCUMENTATION_URL: 'https://docs.elastic.co/search-ui/',
  ELASTICSEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/elasticsearch',
  APP_SEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/app-search',
  WORKPLACE_SEARCH_TUTORIAL_URL: 'https://docs.elastic.co/search-ui/tutorials/workplace-search',
};

export const APPLICATIONS_PLUGIN = {
  ID: ENTERPRISE_SEARCH_APPLICATIONS_APP_ID,
  LOGO: 'logoElasticsearch',
  NAME: i18n.translate('xpack.enterpriseSearch.applications.productName', {
    defaultMessage: 'Applications',
  }),
  NAV_TITLE: i18n.translate('xpack.enterpriseSearch.applications.navTitle', {
    defaultMessage: 'Build',
  }),
  SUPPORT_URL: 'https://discuss.elastic.co/c/enterprise-search/',
  URL: '/app/elasticsearch/applications',
};

export const CREATE_CONNECTOR_PLUGIN = {
  CLI_SNIPPET: dedent`./bin/connectors connector create
  --index-name my-index
  --index-language en
  --from-file config.yml
  `,
};

export const LICENSED_SUPPORT_URL = 'https://support.elastic.co';

export const JSON_HEADER = {
  'Content-Type': 'application/json', // This needs specific casing or Chrome throws a 415 error
  Accept: 'application/json', // Required for Enterprise Search APIs
};

export const ERROR_CONNECTING_HEADER = 'x-ent-search-error-connecting';
export const READ_ONLY_MODE_HEADER = 'x-ent-search-read-only-mode';

export const ENTERPRISE_SEARCH_KIBANA_COOKIE = '_enterprise_search';

export const ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID = 'ent-search-logs';
export const ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID = 'ent-search-audit-logs';
export const ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID = 'ent-search-analytics-logs';

export const CREATE_NEW_INDEX_URL = '/search_indices/new_index';
export const PLAYGROUND_URL = '/playground';
export const SEARCH_HOMEPAGE_URL = '/app/elasticsearch/home';

export const MANAGE_API_KEYS_URL = '/app/management/security/api_keys';

export const ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT = 25;

// TODO: Remove?
export const ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE = 'elastic-crawler';

export const DEFAULT_PIPELINE_NAME = 'search-default-ingestion';
export const DEFAULT_PIPELINE_VALUES: IngestPipelineParams = {
  extract_binary_content: true,
  name: DEFAULT_PIPELINE_NAME,
  reduce_whitespace: true,
  run_ml_inference: true,
};

export interface DefaultConnectorsPipelineMeta {
  default_extract_binary_content: boolean;
  default_name: string;
  default_reduce_whitespace: boolean;
  default_run_ml_inference: boolean;
}

export const defaultConnectorsPipelineMeta: DefaultConnectorsPipelineMeta = {
  default_extract_binary_content: DEFAULT_PIPELINE_VALUES.extract_binary_content,
  default_name: DEFAULT_PIPELINE_NAME,
  default_reduce_whitespace: DEFAULT_PIPELINE_VALUES.reduce_whitespace,
  default_run_ml_inference: DEFAULT_PIPELINE_VALUES.run_ml_inference,
};

export enum INGESTION_METHOD_IDS {
  API = 'api',
  CONNECTOR = 'connector',
}

export const DEFAULT_PRODUCT_FEATURES: ProductFeatures = {
  hasConnectors: true,
  hasDefaultIngestPipeline: true,
  hasDocumentLevelSecurityEnabled: true,
  hasIncrementalSyncEnabled: true,
  hasNativeConnectors: true,
  hasWebCrawler: true,
};

export const CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX = '.search-acl-filter-';
export const PLUGIN_ID = 'enterpriseSearch';

export const CONNECTOR_NATIVE_TYPE = 'native';
export const CONNECTOR_CLIENTS_TYPE = 'connector_clients';

export const CRAWLER = {
  github_repo: 'https://github.com/elastic/crawler',
};

// TODO remove this once the connector service types are no longer in "example" state
export const EXAMPLE_CONNECTOR_SERVICE_TYPES = ['opentext_documentum'];

export const SEARCH_APPS_BREADCRUMB = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.breadcrumb',
  {
    defaultMessage: 'Search Applications',
  }
);
