/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import type { SynthtraceEsClient } from '../../common/synthtrace_es_client';

export const dataConfig = {
  spanType: 'db',
};

export async function generateData({
  synthtraceEsClient,
  backendName,
  start,
  end,
}: {
  synthtraceEsClient: SynthtraceEsClient;
  backendName: string;
  start: number;
  end: number;
}) {
  const instance = service('synth-go', 'production', 'go').instance('instance-a');
  const transactionName = 'GET /api/product/list';
  const spanName = 'GET apm-*/_search';

  await synthtraceEsClient.index(
    timerange(start, end)
      .interval('1m')
      .rate(10)
      .flatMap((timestamp) =>
        instance
          .transaction(transactionName)
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            instance
              .span(spanName, dataConfig.spanType, backendName)
              .duration(1000)
              .success()
              .destination(backendName)
              .timestamp(timestamp)
          )
          .serialize()
      )
  );
}
