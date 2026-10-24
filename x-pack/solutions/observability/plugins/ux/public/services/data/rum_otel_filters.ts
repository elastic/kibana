/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  URL_FULL,
} from '../../../common/elasticsearch_fieldnames';
import {
  OTEL_DOCUMENT_LOAD,
  OTEL_EVENT_BROWSER_WEB_VITAL,
  OTEL_EVENT_EXCEPTION,
  OTEL_EVENT_NAME,
  OTEL_HTTP_URL,
  OTEL_PAGE_URL,
  OTEL_SERVICE_NAME,
  OTEL_SPAN_NAME,
  OTEL_URL_FULL,
  OTEL_WEB_VITAL_NAME,
  RUM_PAGE_LOAD_KQL,
} from '../../../common/otel_rum';

export { RUM_PAGE_LOAD_KQL };
import { TRANSACTION_PAGE_EXIT, TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';

/** Classic APM RUM page-load OR EDOT Browser documentLoad span. */
export function rumPageLoadFilter(): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        {
          bool: {
            filter: [
              { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
              { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            ],
          },
        },
        { term: { [OTEL_SPAN_NAME]: OTEL_DOCUMENT_LOAD } },
      ],
      minimum_should_match: 1,
    },
  };
}

/** Classic page-exit OR OTel INP web-vital log. */
export function rumPageExitOrInpFilter(): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        {
          bool: {
            filter: [
              { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_EXIT } },
              { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            ],
          },
        },
        {
          bool: {
            filter: [
              { term: { [OTEL_EVENT_NAME]: OTEL_EVENT_BROWSER_WEB_VITAL } },
              { term: { [OTEL_WEB_VITAL_NAME]: 'inp' } },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
}

export function rumWebVitalLogsFilter(): QueryDslQueryContainer {
  return { term: { [OTEL_EVENT_NAME]: OTEL_EVENT_BROWSER_WEB_VITAL } };
}

export function rumErrorsFilter(): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        {
          bool: {
            filter: [
              { term: { 'agent.name': 'rum-js' } },
              { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
            ],
          },
        },
        { term: { [OTEL_EVENT_NAME]: OTEL_EVENT_EXCEPTION } },
      ],
      minimum_should_match: 1,
    },
  };
}

export function rumServiceNameFilter(serviceName: string): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [OTEL_SERVICE_NAME]: serviceName } },
      ],
      minimum_should_match: 1,
    },
  };
}

export function rumServiceNameTermsValues(values: string[]): QueryDslQueryContainer {
  return {
    bool: {
      should: [{ terms: { [SERVICE_NAME]: values } }, { terms: { [OTEL_SERVICE_NAME]: values } }],
      minimum_should_match: 1,
    },
  };
}

export function rumUrlWildcardFilter(urlQuery: string): QueryDslQueryContainer {
  return {
    bool: {
      should: [
        { wildcard: { [URL_FULL]: `*${urlQuery}*` } },
        { wildcard: { [OTEL_URL_FULL]: `*${urlQuery}*` } },
        { wildcard: { [OTEL_PAGE_URL]: `*${urlQuery}*` } },
        { wildcard: { [OTEL_HTTP_URL]: `*${urlQuery}*` } },
      ],
      minimum_should_match: 1,
    },
  };
}
