/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, ApmFields, timerange } from '@elastic/apm-synthtrace';
import uuid from 'uuid';

export function generateIncomeEventsSpanLinks() {
  const range = timerange(
    new Date('2021-12-30T00:00:00.000Z'),
    new Date('2021-12-30T00:15:00.000Z')
  );
  const instanceGo = apm.service('service-B', 'production', 'go').instance('instance-a');
  const events = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return instanceGo
        .transaction('GET /service_B')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceGo
            .span('get_service_B', 'external', 'http')
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });

  return events;
}

export function generateExternalSpanLinks(numberOfLinks: number) {
  return Array(numberOfLinks)
    .fill(0)
    .map(() => ({ span: { id: uuid() }, trace: { id: uuid() } }));
}

export type SpanLinks = ReturnType<typeof getSpanLinksFromEvents>;

export function getSpanLinksFromEvents(events: ApmFields[]) {
  return events
    .map((event) => {
      const spanId = event['span.id'] || event['transaction.id'];
      return spanId ? { span: { id: spanId }, trace: { id: event['trace.id'] } } : undefined;
    })
    .filter((_) => _) as Array<{ span: { id: string }; trace: { id: string } }>;
}
