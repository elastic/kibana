/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationSummary } from '../../../../common/types/applications';
import { ratio, toLastSeen } from '../../../lib/helpers/aggregations';
import { toHttpRequests } from '../../../lib/helpers/http_requests';
import { toWebVitals } from '../../../lib/helpers/web_vitals';
import { environmentsOf } from '../../../lib/otel/environments';
import type { LogsBucket, SpansBucket } from './search_responses';

/** One application from its logs bucket and, when it made HTTP requests, its spans bucket. */
export const toApplication = (logs: LogsBucket, spans?: SpansBucket): ApplicationSummary => ({
  serviceName: logs.key,
  source: APPLICATION_SOURCE.otel,
  environments: environmentsOf(logs, spans),
  pageLoads: { count: logs.pageLoads.doc_count },
  webVitals: toWebVitals(logs),
  jsErrors: {
    count: logs.jsErrors.doc_count,
    perPageLoad: ratio(logs.jsErrors.doc_count, logs.pageLoads.doc_count),
  },
  httpRequests: toHttpRequests(spans?.requests.doc_count ?? 0, spans?.failed.doc_count ?? 0),
  lastSeen: toLastSeen(logs.lastSeen.value, spans?.lastSeen.value),
});
