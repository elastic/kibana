/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import {
  generateApmData,
  generateLogsData,
  generateRulesData,
  TEST_START_DATE,
  TEST_END_DATE,
} from '../fixtures/generators';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apmSynthtraceEsClient, logsSynthtraceEsClient, apiServices, log }) => {
    log.info('Generating Observability data...');
    await apmSynthtraceEsClient.index(
      generateApmData({
        from: new Date(TEST_START_DATE).getTime(),
        to: new Date(TEST_END_DATE).getTime(),
      })
    );
    await logsSynthtraceEsClient.index(
      generateLogsData({
        from: new Date(TEST_START_DATE).getTime(),
        to: new Date(TEST_END_DATE).getTime(),
      })
    );
    await generateRulesData(apiServices, log);
  }
);
