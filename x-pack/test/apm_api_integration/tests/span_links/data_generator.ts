/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import { SpanLink } from '@kbn/apm-plugin/typings/es_schemas/raw/fields/span_links';

function getServiceAData() {
  const serviceAInstanceGo = apm.service('Service A', 'production', 'go').instance('instance a');

  const serviceAEvents = timerange(
    new Date('2022-01-01T00:00:00.000Z'),
    new Date('2022-01-01T00:01:00.000Z')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceAInstanceGo
        .transaction(`Transaction A`)
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          serviceAInstanceGo
            .span(`Span A`, 'external', 'http')
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });

  const serviceAAsArray = serviceAEvents.toArray();
  const transactionA = serviceAAsArray.find((item) => item['processor.event'] === 'transaction');
  const spanA = serviceAAsArray.find((item) => item['processor.event'] === 'span');
  const serviceAIds = {
    transactionAId: transactionA?.['transaction.id']!,
    traceId: spanA?.['trace.id']!,
    spanAId: spanA?.['span.id']!,
  };
  const serviceASpanALink = {
    trace: { id: spanA?.['trace.id']! },
    span: { id: spanA?.['span.id']! },
  };

  return {
    serviceAIds,
    serviceASpanALink,
    serviceAAsArray,
  };
}

function getServiceBData() {
  const serviceBInstanceJava = apm
    .service('Service B', 'production', 'java')
    .instance('instance b');

  const serviceBEvents = timerange(
    new Date('2022-01-01T00:02:00.000Z'),
    new Date('2022-01-01T00:03:00.000Z')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceBInstanceJava
        .transaction(`Transaction B`)
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          serviceBInstanceJava
            .span(`Span B`, 'external', 'http')
            .defaults({ 'span.links': [{ trace: { id: '1' }, span: { id: '2' } }] })
            .timestamp(timestamp + 50)
            .duration(100)
            .success(),
          serviceBInstanceJava
            .span(`Span B.1`, 'external', 'http')
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });

  const serviceBAsArray = serviceBEvents.toArray();
  const transactionB = serviceBAsArray.find((item) => item['processor.event'] === 'transaction');
  const spanB = serviceBAsArray.find(
    (item) => item['processor.event'] === 'span' && item['span.name'] === 'Span B'
  );
  const serviceBIds = {
    traceId: spanB?.['trace.id']!,
    transactionBId: transactionB?.['transaction.id']!,
    spanBId: spanB?.['span.id']!,
  };

  const serviceBSpanBLink = {
    trace: { id: spanB?.['trace.id']! },
    span: { id: spanB?.['span.id']! },
  };

  return {
    serviceBIds,
    serviceBSpanBLink,
    serviceBAsArray,
  };
}

function getServiceCData({ serviceASpanALink }: { serviceASpanALink: SpanLink }) {
  const serviceCInstanceRuby = apm
    .service('Service C', 'production', 'ruby')
    .instance('instance c');

  const serviceCEvents = timerange(
    new Date('2022-01-01T00:04:00.000Z'),
    new Date('2022-01-01T00:05:00.000Z')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceCInstanceRuby
        .transaction(`Transaction C`)
        .defaults({ 'span.links': [serviceASpanALink] })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          serviceCInstanceRuby
            .span(`Span C`, 'external', 'http')
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });

  const serviceCAsArray = serviceCEvents.toArray();
  const transactionC = serviceCAsArray.find((item) => item['processor.event'] === 'transaction');
  const serviceCTransactionCLink = {
    trace: { id: transactionC?.['trace.id']! },
    span: { id: transactionC?.['transaction.id']! },
  };
  const spanC = serviceCAsArray.find(
    (item) => item['processor.event'] === 'span' || item['span.name'] === 'Span C'
  );
  const serviceCSpanCLink = {
    trace: { id: spanC?.['trace.id']! },
    span: { id: spanC?.['span.id']! },
  };
  const serviceCIds = {
    traceId: transactionC?.['trace.id']!,
    transactionCId: transactionC?.['transaction.id']!,
    spanCId: spanC?.['span.id']!,
  };
  return {
    serviceCTransactionCLink,
    serviceCSpanCLink,
    serviceCIds,
    serviceCAsArray,
  };
}

function getServiceDData({
  serviceASpanALink,
  serviceBSpanBLink,
  serviceCSpanCLink,
  serviceCTransactionCLink,
}: {
  serviceASpanALink: SpanLink;
  serviceBSpanBLink: SpanLink;
  serviceCSpanCLink: SpanLink;
  serviceCTransactionCLink: SpanLink;
}) {
  const serviceDInstanceNode = apm
    .service('Service D', 'production', 'nodejs')
    .instance('instance d');

  const serviceDEvents = timerange(
    new Date('2022-01-01T00:06:00.000Z'),
    new Date('2022-01-01T00:07:00.000Z')
  )
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return serviceDInstanceNode
        .transaction(`Transaction D`)
        .defaults({ 'span.links': [serviceASpanALink, serviceCSpanCLink] })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          serviceDInstanceNode
            .span(`Span E`, 'external', 'http')
            .defaults({ 'span.links': [serviceBSpanBLink, serviceCTransactionCLink] })
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });
  const serviceDAsArray = serviceDEvents.toArray();
  const transactionD = serviceDAsArray.find((item) => item['processor.event'] === 'transaction');
  const spanE = serviceDAsArray.find((item) => item['processor.event'] === 'span');

  const serviceDIds = {
    traceId: transactionD?.['trace.id']!,
    transactionDId: transactionD?.['transaction.id']!,
    spanEId: spanE?.['span.id']!,
  };

  return {
    serviceDIds,
    serviceDAsArray,
  };
}

/**
 * Data ingestion summary:
 *
 * Service A (go)
 * --Transaction A
 * ----Span A
 *
 * Service B (java)
 * --Transaction B
 * ----Span B
 * ------span.links=external link
 * ----Span B1
 *
 * Service C (ruby)
 * --Transaction C
 * ------span.links=Service A / Span A
 * ----Span C
 *
 * Service D (nodejs)
 * --Transaction D
 * ------span.links= Service C / Span C | Service A / Span A
 * ----Span E
 * ------span.links= Service B / Span B | Service C / Transaction C
 */
export function generateSpanLinksData() {
  const { serviceAAsArray, serviceAIds, serviceASpanALink } = getServiceAData();
  const { serviceBAsArray, serviceBIds, serviceBSpanBLink } = getServiceBData();
  const { serviceCAsArray, serviceCIds, serviceCSpanCLink, serviceCTransactionCLink } =
    getServiceCData({ serviceASpanALink });
  const { serviceDAsArray, serviceDIds } = getServiceDData({
    serviceASpanALink,
    serviceBSpanBLink,
    serviceCSpanCLink,
    serviceCTransactionCLink,
  });

  return {
    events: {
      serviceAAsArray,
      serviceBAsArray,
      serviceCAsArray,
      serviceDAsArray,
    },
    ids: {
      serviceAIds,
      serviceBIds,
      serviceCIds,
      serviceDIds,
    },
  };
}
