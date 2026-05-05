/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./otlp_receiver')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        // Configure Kibana to export OTel metrics to the in-process gRPC receiver
        '--monitoring_collection.opentelemetry.metrics.otlp.url=grpc://localhost:4317',
        // Short interval so the test doesn't have to wait the default 10 s
        '--monitoring_collection.opentelemetry.metrics.otlp.exportIntervalMillis=2000',
      ],
    },
    junit: {
      reportName: 'X-Pack API Integration Tests – OTLP Metrics Receiver',
    },
  };
}
