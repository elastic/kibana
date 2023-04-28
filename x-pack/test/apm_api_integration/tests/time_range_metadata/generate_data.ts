/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import moment, { Moment } from 'moment';
import { Transform, Readable } from 'stream';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export function getTransactionEvents(start: Moment, end: Moment) {
  const serviceName = 'synth-go';
  const transactionName = 'GET /api/product/list';
  const GO_PROD_RATE = 75;
  const GO_PROD_ERROR_RATE = 25;

  const serviceGoProdInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  return [
    timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName })
          .timestamp(timestamp)
          .duration(1000)
          .success()
      ),

    timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_ERROR_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName })
          .duration(1000)
          .timestamp(timestamp)
          .failure()
      ),
  ];
}

export function subtractDateDifference(start: Moment, end: Moment) {
  const diff = moment(end).diff(moment(start)) + 1000;
  const previousStart = moment(start).subtract(diff, 'milliseconds').format();
  const previousEnd = moment(end).subtract(diff, 'milliseconds').format();
  return { previousStart: moment(previousStart), previousEnd: moment(previousEnd) };
}

export function deleteSummaryFieldTransform() {
  return new Transform({
    objectMode: true,
    transform(chunk: any, encoding, callback) {
      delete chunk?.transaction?.duration?.summary;
      callback(null, chunk);
    },
  });
}

export function overwriteSynthEsClientPipeline({
  synthtraceEsClient,
  reset = false,
  additionalTransform,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  reset: boolean;
  additionalTransform?: () => Transform;
}) {
  return (base: Readable) => {
    const defaultPipeline = synthtraceEsClient.getDefaultPipeline()(
      base
    ) as unknown as NodeJS.ReadableStream;
    if (reset) {
      return defaultPipeline;
    }
    return additionalTransform ? defaultPipeline.pipe(additionalTransform()) : defaultPipeline;
  };
}
