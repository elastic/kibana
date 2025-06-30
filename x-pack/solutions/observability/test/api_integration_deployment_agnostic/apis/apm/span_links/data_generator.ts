/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { SpanLink } from '@kbn/apm-plugin/typings/es_schemas/raw/fields/span_links';
import { v4 as uuidv4 } from 'uuid';
import { Moment } from 'moment';
import moment from 'moment';

function getProducerInternalOnly({ start }: { start: Moment }) {
  const producerInternalOnlyInstance = apm
    .service({ name: 'producer-internal-only', environment: 'production', agentName: 'go' })
    .instance('instance a');

  const events = Array.from(
    timerange(moment(start).toISOString(), moment(start).add('1', 'minute').toISOString())
      .interval('1m')
      .rate(1)
      .generator((timestamp) => {
        return producerInternalOnlyInstance
          .transaction({ transactionName: `Transaction A` })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerInternalOnlyInstance
              .span({ spanName: `Span A`, spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          );
      })
  );

  const apmFields = events.flatMap((event) => event.serialize());
  const transactionA = apmFields.find((item) => item['processor.event'] === 'transaction');
  const spanA = apmFields.find((item) => item['processor.event'] === 'span');

  const ids = {
    transactionAId: transactionA?.['transaction.id']!,
    traceId: spanA?.['trace.id']!,
    spanAId: spanA?.['span.id']!,
  };
  const spanASpanLink = {
    trace: { id: spanA?.['trace.id']! },
    span: { id: spanA?.['span.id']! },
  };

  return {
    ids,
    spanASpanLink,
    events,
  };
}

function getProducerExternalOnly({ start }: { start: Moment }) {
  const producerExternalOnlyInstance = apm
    .service({ name: 'producer-external-only', environment: 'production', agentName: 'java' })
    .instance('instance b');

  const events = Array.from(
    timerange(
      moment(start).add(2, 'minutes').toISOString(),
      moment(start).add(3, 'minutes').toISOString()
    )
      .interval('1m')
      .rate(1)
      .generator((timestamp) => {
        return producerExternalOnlyInstance
          .transaction({ transactionName: `Transaction B` })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerExternalOnlyInstance
              .span({ spanName: `Span B`, spanType: 'external', spanSubtype: 'http' })
              .defaults({
                'span.links': [{ trace: { id: 'trace#1' }, span: { id: 'span#1' } }],
              })
              .timestamp(timestamp + 50)
              .duration(100)
              .success(),
            producerExternalOnlyInstance
              .span({ spanName: `Span B.1`, spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          );
      })
  );

  const apmFields = events.flatMap((event) => event.serialize());
  const transactionB = apmFields.find((item) => item['processor.event'] === 'transaction');
  const spanB = apmFields.find(
    (item) => item['processor.event'] === 'span' && item['span.name'] === 'Span B'
  );
  const ids = {
    traceId: spanB?.['trace.id']!,
    transactionBId: transactionB?.['transaction.id']!,
    spanBId: spanB?.['span.id']!,
  };

  const spanBSpanLink = {
    trace: { id: spanB?.['trace.id']! },
    span: { id: spanB?.['span.id']! },
  };

  const transactionBSpanLink = {
    trace: { id: transactionB?.['trace.id']! },
    span: { id: transactionB?.['transaction.id']! },
  };

  return {
    ids,
    spanBSpanLink,
    transactionBSpanLink,
    events,
  };
}

function getProducerConsumer({
  producerInternalOnlySpanASpanLink,
  producerExternalOnlySpanBLink,
  producerExternalOnlyTransactionBLink,
  start,
}: {
  producerInternalOnlySpanASpanLink: SpanLink;
  producerExternalOnlySpanBLink: SpanLink;
  producerExternalOnlyTransactionBLink: SpanLink;
  start: Moment;
}) {
  const externalTraceId = uuidv4();

  const producerConsumerInstance = apm
    .service({ name: 'producer-consumer', environment: 'production', agentName: 'ruby' })
    .instance('instance c');

  const events = Array.from(
    timerange(
      moment(start).add(4, 'minutes').toISOString(),
      moment(start).add(5, 'minutes').toISOString()
    )
      .interval('1m')
      .rate(1)
      .generator((timestamp) => {
        return producerConsumerInstance
          .transaction({ transactionName: `Transaction C` })
          .defaults({
            'span.links': [
              producerInternalOnlySpanASpanLink,
              producerExternalOnlyTransactionBLink,
              {
                trace: { id: externalTraceId },
                span: { id: producerExternalOnlySpanBLink.span.id },
              },
            ],
          })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            producerConsumerInstance
              .span({ spanName: `Span C`, spanType: 'external', spanSubtype: 'http' })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          );
      })
  );

  const apmFields = events.flatMap((event) => event.serialize());
  const transactionC = apmFields.find((item) => item['processor.event'] === 'transaction');
  const transactionCSpanLink = {
    trace: { id: transactionC?.['trace.id']! },
    span: { id: transactionC?.['transaction.id']! },
  };
  const spanC = apmFields.find(
    (item) => item['processor.event'] === 'span' || item['span.name'] === 'Span C'
  );
  const spanCSpanLink = {
    trace: { id: spanC?.['trace.id']! },
    span: { id: spanC?.['span.id']! },
  };
  const ids = {
    traceId: transactionC?.['trace.id']!,
    transactionCId: transactionC?.['transaction.id']!,
    spanCId: spanC?.['span.id']!,
    externalTraceId,
  };
  return {
    transactionCSpanLink,
    spanCSpanLink,
    ids,
    events,
  };
}

function getConsumerMultiple({
  producerInternalOnlySpanALink,
  producerExternalOnlySpanBLink,
  producerConsumerSpanCLink,
  producerConsumerTransactionCLink,
  start,
}: {
  producerInternalOnlySpanALink: SpanLink;
  producerExternalOnlySpanBLink: SpanLink;
  producerConsumerSpanCLink: SpanLink;
  producerConsumerTransactionCLink: SpanLink;
  start: Moment;
}) {
  const consumerMultipleInstance = apm
    .service({ name: 'consumer-multiple', environment: 'production', agentName: 'nodejs' })
    .instance('instance d');

  const events = Array.from(
    timerange(
      moment(start).add(6, 'minutes').toISOString(),
      moment(start).add(7, 'minutes').toISOString()
    )
      .interval('1m')
      .rate(1)
      .generator((timestamp) => {
        return consumerMultipleInstance
          .transaction({ transactionName: `Transaction D` })
          .defaults({ 'span.links': [producerInternalOnlySpanALink, producerConsumerSpanCLink] })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            consumerMultipleInstance
              .span({ spanName: `Span E`, spanType: 'external', spanSubtype: 'http' })
              .defaults({
                'span.links': [producerExternalOnlySpanBLink, producerConsumerTransactionCLink],
              })
              .timestamp(timestamp + 50)
              .duration(100)
              .success()
          );
      })
  );
  const apmFields = events.flatMap((event) => event.serialize());
  const transactionD = apmFields.find((item) => item['processor.event'] === 'transaction');
  const spanE = apmFields.find((item) => item['processor.event'] === 'span');

  const ids = {
    traceId: transactionD?.['trace.id']!,
    transactionDId: transactionD?.['transaction.id']!,
    spanEId: spanE?.['span.id']!,
  };

  return {
    ids,
    events,
  };
}

/**
 * Data ingestion summary:
 *
 * producer-internal-only (go)
 * --Transaction A
 * ----Span A
 *
 * producer-external-only (java)
 * --Transaction B
 * ----Span B
 * ------span.links=external link
 * ----Span B1
 *
 * producer-consumer (ruby)
 * --Transaction C
 * ------span.links=Service A / Span A
 * ------span.links=Service B / Transaction B
 * ------span.links=External ID / Span B
 * ----Span C
 *
 * consumer-multiple (nodejs)
 * --Transaction D
 * ------span.links= Service C / Span C | Service A / Span A
 * ----Span E
 * ------span.links= Service B / Span B | Service C / Transaction C
 */
export function generateSpanLinksData({ start }: { start: Moment }) {
  const producerInternalOnly = getProducerInternalOnly({ start });
  const producerExternalOnly = getProducerExternalOnly({ start });
  const producerConsumer = getProducerConsumer({
    producerInternalOnlySpanASpanLink: producerInternalOnly.spanASpanLink,
    producerExternalOnlySpanBLink: producerExternalOnly.spanBSpanLink,
    producerExternalOnlyTransactionBLink: producerExternalOnly.transactionBSpanLink,
    start,
  });
  const producerMultiple = getConsumerMultiple({
    producerInternalOnlySpanALink: producerInternalOnly.spanASpanLink,
    producerExternalOnlySpanBLink: producerExternalOnly.spanBSpanLink,
    producerConsumerSpanCLink: producerConsumer.spanCSpanLink,
    producerConsumerTransactionCLink: producerConsumer.transactionCSpanLink,
    start,
  });
  return {
    events: {
      producerInternalOnly: producerInternalOnly.events,
      producerExternalOnly: producerExternalOnly.events,
      producerConsumer: producerConsumer.events,
      producerMultiple: producerMultiple.events,
    },
    ids: {
      producerInternalOnly: producerInternalOnly.ids,
      producerExternalOnly: producerExternalOnly.ids,
      producerConsumer: producerConsumer.ids,
      producerMultiple: producerMultiple.ids,
    },
  };
}
