/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, ApmFields, timerange, Signal } from '@kbn/apm-synthtrace';
import { SpanLink } from '@kbn/apm-plugin/typings/es_schemas/raw/fields/span_links';
import uuid from 'uuid';

function getProducerInternalOnly() {
  const producerInternalOnlyInstance = apm
    .service({ name: 'producer-internal-only', environment: 'production', agentName: 'go' })
    .instance('instance a');

  const generator = timerange(
    new Date('2022-01-01T00:00:00.000Z'),
    new Date('2022-01-01T00:01:00.000Z')
  )
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
    });

  const signals = generator.toArray();
  const transactionA = signals.find((item) => item.fields['processor.event'] === 'transaction');
  const spanA = signals.find((item) => item.fields['processor.event'] === 'span');

  const ids = {
    transactionAId: transactionA?.fields['transaction.id']!,
    traceId: spanA?.fields['trace.id']!,
    spanAId: spanA?.fields['span.id']!,
  };
  const spanASpanLink = {
    trace: { id: spanA?.fields['trace.id']! },
    span: { id: spanA?.fields['span.id']! },
  };

  return {
    ids,
    spanASpanLink,
    signals,
  };
}

function getProducerExternalOnly() {
  const producerExternalOnlyInstance = apm
    .service({ name: 'producer-external-only', environment: 'production', agentName: 'java' })
    .instance('instance b');

  const generator = timerange(
    new Date('2022-01-01T00:02:00.000Z'),
    new Date('2022-01-01T00:03:00.000Z')
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
    });

  const signals = generator.toArray();
  const transactionB = signals.find((item) => item.fields['processor.event'] === 'transaction');
  const spanB = signals.find(
    (item) => item.fields['processor.event'] === 'span' && item.fields['span.name'] === 'Span B'
  );
  const ids = {
    traceId: spanB?.fields['trace.id']!,
    transactionBId: transactionB?.fields['transaction.id']!,
    spanBId: spanB?.fields['span.id']!,
  };

  const spanBSpanLink = {
    trace: { id: spanB?.fields['trace.id']! },
    span: { id: spanB?.fields['span.id']! },
  };

  const transactionBSpanLink = {
    trace: { id: transactionB?.fields['trace.id']! },
    span: { id: transactionB?.fields['transaction.id']! },
  };

  return {
    ids,
    spanBSpanLink,
    transactionBSpanLink,
    signals,
  };
}

function getProducerConsumer({
  producerInternalOnlySpanASpanLink,
  producerExternalOnlySpanBLink,
  producerExternalOnlyTransactionBLink,
}: {
  producerInternalOnlySpanASpanLink: SpanLink;
  producerExternalOnlySpanBLink: SpanLink;
  producerExternalOnlyTransactionBLink: SpanLink;
}) {
  const externalTraceId = uuid.v4();

  const producerConsumerInstance = apm
    .service({ name: 'producer-consumer', environment: 'production', agentName: 'ruby' })
    .instance('instance c');

  const generator = timerange(
    new Date('2022-01-01T00:04:00.000Z'),
    new Date('2022-01-01T00:05:00.000Z')
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
            { trace: { id: externalTraceId }, span: { id: producerExternalOnlySpanBLink.span.id } },
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
    });

  const signals = generator.toArray();
  const transactionC = signals.find((item) => item.fields['processor.event'] === 'transaction');
  const transactionCSpanLink = {
    trace: { id: transactionC?.fields['trace.id']! },
    span: { id: transactionC?.fields['transaction.id']! },
  };
  const spanC = signals.find(
    (item) => item.fields['processor.event'] === 'span' || item.fields['span.name'] === 'Span C'
  );
  const spanCSpanLink = {
    trace: { id: spanC?.fields['trace.id']! },
    span: { id: spanC?.fields['span.id']! },
  };
  const ids = {
    traceId: transactionC?.fields['trace.id']!,
    transactionCId: transactionC?.fields['transaction.id']!,
    spanCId: spanC?.fields['span.id']!,
    externalTraceId,
  };
  return {
    transactionCSpanLink,
    spanCSpanLink,
    ids,
    signals,
  };
}

function getConsumerMultiple({
  producerInternalOnlySpanALink,
  producerExternalOnlySpanBLink,
  producerConsumerSpanCLink,
  producerConsumerTransactionCLink,
}: {
  producerInternalOnlySpanALink: SpanLink;
  producerExternalOnlySpanBLink: SpanLink;
  producerConsumerSpanCLink: SpanLink;
  producerConsumerTransactionCLink: SpanLink;
}) {
  const consumerMultipleInstance = apm
    .service({ name: 'consumer-multiple', environment: 'production', agentName: 'nodejs' })
    .instance('instance d');

  const generator = timerange(
    new Date('2022-01-01T00:06:00.000Z'),
    new Date('2022-01-01T00:07:00.000Z')
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
    });
  const signals = generator.toArray();
  const transactionD = signals.find((item) => item.fields['processor.event'] === 'transaction');
  const spanE = signals.find((item) => item.fields['processor.event'] === 'span');

  const ids = {
    traceId: transactionD?.fields['trace.id']!,
    transactionDId: transactionD?.fields['transaction.id']!,
    spanEId: spanE?.fields['span.id']!,
  };

  return {
    ids,
    signals,
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
export function generateSpanLinksData(): {
  signals: {
    producerMultiple: Array<Signal<ApmFields>>;
    producerInternalOnly: Array<Signal<ApmFields>>;
    producerExternalOnly: Array<Signal<ApmFields>>;
    producerConsumer: Array<Signal<ApmFields>>;
  };
  ids: {
    producerMultiple: { traceId: string; spanEId: string; transactionDId: string };
    producerInternalOnly: { traceId: string; transactionAId: string; spanAId: string };
    producerExternalOnly: { traceId: string; transactionBId: string; spanBId: string };
    producerConsumer: {
      traceId: string;
      spanCId: string;
      transactionCId: string;
      externalTraceId: string;
    };
  };
} {
  const producerInternalOnly = getProducerInternalOnly();
  const producerExternalOnly = getProducerExternalOnly();
  const producerConsumer = getProducerConsumer({
    producerInternalOnlySpanASpanLink: producerInternalOnly.spanASpanLink,
    producerExternalOnlySpanBLink: producerExternalOnly.spanBSpanLink,
    producerExternalOnlyTransactionBLink: producerExternalOnly.transactionBSpanLink,
  });
  const producerMultiple = getConsumerMultiple({
    producerInternalOnlySpanALink: producerInternalOnly.spanASpanLink,
    producerExternalOnlySpanBLink: producerExternalOnly.spanBSpanLink,
    producerConsumerSpanCLink: producerConsumer.spanCSpanLink,
    producerConsumerTransactionCLink: producerConsumer.transactionCSpanLink,
  });
  return {
    signals: {
      producerInternalOnly: producerInternalOnly.signals,
      producerExternalOnly: producerExternalOnly.signals,
      producerConsumer: producerConsumer.signals,
      producerMultiple: producerMultiple.signals,
    },
    ids: {
      producerInternalOnly: producerInternalOnly.ids,
      producerExternalOnly: producerExternalOnly.ids,
      producerConsumer: producerConsumer.ids,
      producerMultiple: producerMultiple.ids,
    },
  };
}
