/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import type { ApplicationSummary } from '../../../../common/types/applications';
import { ratio, toLastSeen } from '../../../lib/helpers/aggregations';
import { toHttpRequests } from '../../../lib/helpers/http_requests';
import { toWebVitals } from '../../../lib/helpers/web_vitals';
import { environmentsOf } from '../../../lib/otel/environments';
import type { LogsBucket, SpansBucket } from './search_responses';

/**
 * One application from its logs bucket and its spans bucket, whichever it has. Without logs it has
 * no page loads, vitals or JS errors.
 */
export const toApplication = (
  serviceName: string,
  logs?: LogsBucket,
  spans?: SpansBucket
): ApplicationSummary => {
  const pageLoads = logs?.pageLoads.doc_count ?? 0;
  const jsErrors = logs?.jsErrors.doc_count ?? 0;
  return {
    serviceName,
    source: APPLICATION_SOURCE.otel,
    environments: environmentsOf(logs, spans),
    pageLoads: { count: pageLoads },
    // Counting the distinct sessions of the raw events would add a cardinality to the heavy search.
    sessions: null,
    webVitals: logs ? toWebVitals(logs) : NO_WEB_VITALS,
    jsErrors: { count: jsErrors, perPageLoad: ratio(jsErrors, pageLoads) },
    httpRequests: toHttpRequests(spans?.requests.doc_count ?? 0, spans?.failed.doc_count ?? 0),
    lastSeen: toLastSeen(logs?.lastSeen.value, spans?.lastSeen.value),
  };
};
