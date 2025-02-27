/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm } from '@kbn/apm-synthtrace-client';

type Instance = ReturnType<ReturnType<typeof apm.service>['instance']>;
type Transaction = ReturnType<Instance['transaction']>;

export function generateTrace(
  timestamp: number,
  order: Instance[],
  db?: 'elasticsearch' | 'redis'
) {
  return order
    .concat()
    .reverse()
    .reduce<Transaction | undefined>((prev, instance, index) => {
      const invertedIndex = order.length - index - 1;

      const duration = 50;
      const time = timestamp + invertedIndex * 10;

      const transaction: Transaction = instance
        .transaction({ transactionName: `GET /${instance.fields['service.name']!}/api` })
        .timestamp(time)
        .duration(duration);

      if (prev) {
        const next = order[invertedIndex + 1].fields['service.name']!;
        transaction.children(
          instance
            .span({ spanName: `GET ${next}/api`, spanType: 'external', spanSubtype: 'http' })
            .destination(next)
            .duration(duration)
            .timestamp(time + 1)
            .children(prev)
        );
      } else if (db) {
        transaction.children(
          instance
            .span({ spanName: db, spanType: 'db', spanSubtype: db })
            .destination(db)
            .duration(duration)
            .timestamp(time + 1)
        );
      }

      return transaction;
    }, undefined)!;
}
