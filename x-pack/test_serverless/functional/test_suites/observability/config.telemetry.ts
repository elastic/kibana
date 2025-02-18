/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { GenericFtrProviderContext } from '@kbn/test';
import { KibanaEBTUIProvider } from '@kbn/test-suites-src/analytics/services/kibana_ebt';
import { services as inheritedServices } from '../../services';
import { pageObjects } from '../../page_objects';
import { createTestConfig } from '../../config.base';

type ObservabilityTelemetryServices = typeof inheritedServices & {
  kibana_ebt_ui: typeof KibanaEBTUIProvider;
};

const services: ObservabilityTelemetryServices = {
  ...inheritedServices,
  kibana_ebt_ui: KibanaEBTUIProvider,
};

export type ObservabilityTelemetryFtrProviderContext = GenericFtrProviderContext<
  ObservabilityTelemetryServices,
  typeof pageObjects
>;

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./index.telemetry.ts')],
  junit: {
    reportName: 'Serverless Observability Telemetry Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  services,

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false'],
  kbnServerArgs: [
    `--plugin-path=${resolve(
      __dirname,
      '../../../../../test/analytics/plugins/analytics_ftr_helpers'
    )}`,
  ],
});
