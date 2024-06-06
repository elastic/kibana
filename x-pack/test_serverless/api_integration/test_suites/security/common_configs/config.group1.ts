/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseTestConfig = await readConfigFile(require.resolve('../config.ts'));

  return {
    ...baseTestConfig.getAll(),
    testFiles: [
      require.resolve('../../common/alerting'),
      require.resolve('../../common/data_view_field_editor'),
      require.resolve('../../common/data_views'),
      require.resolve('../../common/elasticsearch_api'),
      require.resolve('../../common/index_management'),
      require.resolve('../../common/kql_telemetry'),
      require.resolve('../../common/management'),
      require.resolve('../../common/platform_security'),
      require.resolve('../../common/scripts_tests'),
      require.resolve('../../common/search_oss'),
      require.resolve('../../common/search_profiler'),
      require.resolve('../../common/search_xpack'),
      require.resolve('../../common/core'),
      require.resolve('../../common/reporting'),
      require.resolve('../../common/grok_debugger'),
      require.resolve('../../common/painless_lab'),
      require.resolve('../../common/console'),
      require.resolve('../../common/telemetry'),
    ],
    junit: {
      reportName: 'Serverless Security API Integration Tests - Common Group 1',
    },
  };
}
