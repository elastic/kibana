/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSpanDestinationMetrics,
  getTransactionMetrics,
  toElasticsearchOutput,
} from '@elastic/apm-generator';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { inspect } from 'util';
import { InheritedFtrProviderContext } from './ftr_provider_context';

export async function traceData(context: InheritedFtrProviderContext) {
  const es = context.getService('es');
  return {
    index: (events: any[]) => {
      const esEvents = toElasticsearchOutput(
        events.concat(getTransactionMetrics(events)).concat(getSpanDestinationMetrics(events)),
        '7.14.0'
      );

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
          .flatMap((result) => result.body.items)
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
        index: 'apm-*',
        body: {
          query: {
            match_all: {},
          },
        },
      });
    },
  };
}
