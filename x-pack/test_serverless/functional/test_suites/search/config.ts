/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'es',
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Serverless Search Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlSearch'] },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/esproject/config/elasticsearch.yml
  esServerArgs: [],
  kbnServerArgs: [
    `--xpack.cloud.id=ES3_FTR_TESTS:ZmFrZS1kb21haW4uY2xkLmVsc3RjLmNvJGZha2Vwcm9qZWN0aWQuZXMkZmFrZXByb2plY3RpZC5rYg==`,
    `--xpack.cloud.serverless.project_id=fakeprojectid`,
    `--xpack.cloud.serverless.project_name=ES3_FTR_TESTS`,
    `--xpack.cloud.serverless.project_type=elasticsearch`,
    `--xpack.cloud.base_url=https://fake-cloud.elastic.co`,
    `--xpack.cloud.profile_url=/user/settings/`,
    `--xpack.cloud.billing_url=/billing/overview/`,
    `--xpack.cloud.deployments_url=/deployments`,
    `--xpack.cloud.deployment_url=/projects/elasticsearch/fakeprojectid`,
    `--xpack.cloud.users_and_roles_url=/account/members/`,
    `--xpack.cloud.projects_url=/projects/`,
    `--xpack.cloud.organization_url=/account/`,
  ],
  apps: {
    serverlessElasticsearch: {
      pathname: '/app/elasticsearch',
    },
    serverlessConnectors: {
      pathname: '/app/connectors',
    },
    searchPlayground: {
      pathname: '/app/search_playground',
    },
  },
});
