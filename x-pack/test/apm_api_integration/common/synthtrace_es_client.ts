/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreakdownMetrics,
  getSpanDestinationMetrics,
  getTransactionMetrics,
  toElasticsearchOutput,
} from '@elastic/apm-synthtrace';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { inspect } from 'util';
import { PromiseReturnType } from '../../../plugins/observability/typings/common';
import { InheritedFtrProviderContext } from './ftr_provider_context';

const writeTargetsDatastreams = {
  transaction: 'traces-apm-test',
  span: 'traces-apm-test',
  error: 'logs-apm-test',
  metric: 'metrics-apm-test',
};
const writeTargetsClassicIndices = {
  transaction: 'apm-7.14.0-transaction',
  span: 'apm-7.14.0-span',
  error: 'apm-7.14.0-error',
  metric: 'apm-7.14.0-metric',
};
interface Options {
  useClassicIndices?: boolean;
}
export async function synthtraceEsClient(
  context: InheritedFtrProviderContext,
  options: Options | undefined = {}
) {
  const es = context.getService('es');

  const useClassicIndices = Boolean(options.useClassicIndices);
  return {
    index: (events: any[]) => {
      const esEvents = toElasticsearchOutput({
        events: [
          ...events,
          ...getTransactionMetrics(events),
          ...getSpanDestinationMetrics(events),
          ...getBreakdownMetrics(events),
        ],
        writeTargets: useClassicIndices ? writeTargetsClassicIndices : writeTargetsDatastreams,
      });

      const batches = chunk(esEvents, 1000);
      const limiter = pLimit(1);

      return Promise.all(
        batches.map((batch) =>
          limiter(() => {
            return es.bulk({
              body: batch.flatMap(({ _index, _source }) => [{ index: { _index } }, _source]),
              require_alias: true,
              refresh: true,
            });
          })
        )
      ).then((results) => {
        const errors = results
          .flatMap((result) => result.items)
          .filter((item) => !!item.index?.error)
          .map((item) => item.index?.error);

        if (errors.length) {
          // eslint-disable-next-line no-console
          console.log(inspect(errors.slice(0, 10), { depth: null }));
          throw new Error('Failed to upload some events');
        }
        return results;
      });
    },
    clean: () => {
      return es.deleteByQuery({
        index: useClassicIndices ? 'apm-*' : 'traces-apm*,traces-apm*,logs-apm*,metrics-apm*',
        body: {
          query: {
            match_all: {},
          },
        },
      });
    },
  };
}

export type SynthtraceEsClient = PromiseReturnType<typeof synthtraceEsClient>;
