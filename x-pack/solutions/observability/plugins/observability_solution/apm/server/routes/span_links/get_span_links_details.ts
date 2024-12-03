/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { chunk, compact, isEmpty, keyBy } from 'lodash';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  SERVICE_NAME,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  SPAN_DURATION,
  PROCESSOR_EVENT,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../common/es_fields/apm';
import { Environment } from '../../../common/environment_rt';
import { SpanLinkDetails } from '../../../common/span_links';
import { SpanLink } from '../../../typings/es_schemas/raw/fields/span_links';
import { getBufferedTimerange } from './utils';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

async function fetchSpanLinksDetails({
  apmEventClient,
  kuery,
  spanLinks,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  kuery: string;
  spanLinks: SpanLink[];
  start: number;
  end: number;
}) {
  const { startWithBuffer, endWithBuffer } = getBufferedTimerange({
    start,
    end,
  });

  const requiredFields = asMutableArray([
    TRACE_ID,
    SERVICE_NAME,
    AGENT_NAME,
    PROCESSOR_EVENT,
  ] as const);

  const requiredTxFields = asMutableArray([
    TRANSACTION_ID,
    TRANSACTION_NAME,
    TRANSACTION_DURATION,
  ] as const);

  const requiredSpanFields = asMutableArray([
    SPAN_ID,
    SPAN_NAME,
    SPAN_DURATION,
    SPAN_SUBTYPE,
    SPAN_TYPE,
  ] as const);

  const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);

  const response = await apmEventClient.search('get_span_links_details', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body: {
      fields: [...requiredFields, ...requiredTxFields, ...requiredSpanFields, ...optionalFields],
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [
            ...rangeQuery(startWithBuffer, endWithBuffer),
            ...kqlQuery(kuery),
            {
              bool: {
                should: spanLinks.map((item) => {
                  return {
                    bool: {
                      filter: [
                        { term: { [TRACE_ID]: item.trace.id } },
                        {
                          bool: {
                            should: [
                              { term: { [SPAN_ID]: item.span.id } },
                              { term: { [TRANSACTION_ID]: item.span.id } },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  };
                }),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
  });

  const spanIdsMap = keyBy(spanLinks, 'span.id');

  return response.hits.hits
    .filter((hit) => {
      // The above query might return other spans from the same transaction because siblings spans share the same transaction.id
      // so, if it is a span we need to guarantee that the span.id is the same as the span links ids
      if (hit.fields[PROCESSOR_EVENT]?.[0] === ProcessorEvent.span) {
        const spanLink = unflattenKnownApmEventFields(hit.fields, [
          ...requiredFields,
          ...requiredSpanFields,
        ]);

        const hasSpanId = Boolean(spanIdsMap[spanLink.span.id] || false);
        return hasSpanId;
      }
      return true;
    })
    .map((hit) => {
      const commonEvent = unflattenKnownApmEventFields(hit.fields, requiredFields);

      const commonDetails = {
        serviceName: commonEvent.service.name,
        agentName: commonEvent.agent.name,
        environment: commonEvent.service.environment as Environment,
        transactionId: commonEvent.transaction?.id,
      };

      if (commonEvent.processor.event === ProcessorEvent.transaction) {
        const event = unflattenKnownApmEventFields(hit.fields, [
          ...requiredFields,
          ...requiredTxFields,
        ]);
        return {
          traceId: event.trace.id,
          spanId: event.transaction.id,
          processorEvent: commonEvent.processor.event,
          transactionId: event.transaction.id,
          details: {
            ...commonDetails,
            spanName: event.transaction.name,
            duration: event.transaction.duration.us,
          },
        };
      } else {
        const event = unflattenKnownApmEventFields(hit.fields, [
          ...requiredFields,
          ...requiredSpanFields,
        ]);

        return {
          traceId: event.trace.id,
          spanId: event.span.id,
          processorEvent: commonEvent.processor.event,
          details: {
            ...commonDetails,
            spanName: event.span.name,
            duration: event.span.duration.us,
            spanSubtype: event.span.subtype,
            spanType: event.span.type,
          },
        };
      }
    });
}

export async function getSpanLinksDetails({
  apmEventClient,
  spanLinks,
  kuery,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  spanLinks: SpanLink[];
  kuery: string;
  start: number;
  end: number;
}): Promise<SpanLinkDetails[]> {
  if (!spanLinks.length) {
    return [];
  }

  // chunk span links to avoid too_many_nested_clauses problem
  const spanLinksChunks = chunk(spanLinks, 500);
  const chunkedResponses = await Promise.all(
    spanLinksChunks.map((spanLinksChunk) =>
      fetchSpanLinksDetails({
        apmEventClient,
        kuery,
        spanLinks: spanLinksChunk,
        start,
        end,
      })
    )
  );

  const linkedSpans = chunkedResponses.flat();

  // Creates a map for all span links details found
  const spanLinksDetailsMap = linkedSpans.reduce<Record<string, SpanLinkDetails>>(
    (acc, spanLink) => {
      if (spanLink.processorEvent === ProcessorEvent.transaction) {
        const key = `${spanLink.traceId}:${spanLink.transactionId}`;
        acc[key] = {
          traceId: spanLink.traceId,
          spanId: spanLink.transactionId,
          details: spanLink.details,
        };
      } else {
        const key = `${spanLink.traceId}:${spanLink.spanId}`;
        acc[key] = {
          traceId: spanLink.traceId,
          spanId: spanLink.spanId,
          details: spanLink.details,
        };
      }

      return acc;
    },
    {}
  );

  // It's important to keep the original order of the span links,
  // so loops trough the original list merging external links and links with details.
  // external links are links that the details were not found in the ES query.
  return compact(
    spanLinks.map((item) => {
      const key = `${item.trace.id}:${item.span.id}`;
      const details = spanLinksDetailsMap[key];
      if (details) {
        return details;
      }

      // When kuery is not set, returns external links, if not hides this item.
      return isEmpty(kuery) ? { traceId: item.trace.id, spanId: item.span.id } : undefined;
    })
  );
}
