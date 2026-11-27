/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME, TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { CORE_WEB_VITAL, NO_WEB_VITALS } from '../../../common/core_web_vitals';
import {
  BROWSER_SDK_LANGUAGE,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  OTEL_LOGS_INDEX,
} from '../../../common/otel_data';
import type { WebVitals } from '../../../common/types/applications';
import type { ApplicationSearchParams } from '../../routes/application_tab_route';
import type { WebVitalAggregations } from '../helpers/web_vitals';
import { toWebVitals } from '../helpers/web_vitals';
import type { ByEnvironmentAggregations } from '../otel/environments';
import { pickerEnvironments } from '../otel/environments';
import { byEnvironment, otelSearchDefaults, serviceDocuments, webVital } from '../otel/queries';

/** The aggregations of `webVitalsSearch`: every environment, and the vitals of the selected one. */
export type WebVitalsAggregations = ByEnvironmentAggregations<WebVitalAggregations>;

/**
 * The Core Web Vitals of one application over `start` (included) to `end` (not), and its
 * environments with browser data, for the picker. The same documents as the Overview's search, but
 * without its page-load percentiles, trend and filter facets, which the scorecard never reads. The
 * range excludes `end`, like the KPI searches, so that the period before can end where this one
 * starts and no sample counts in both.
 */
export const webVitalsSearch = ({
  serviceName,
  start,
  end,
  environment,
}: Pick<ApplicationSearchParams, 'serviceName' | 'start' | 'end' | 'environment'>) => ({
  ...otelSearchDefaults(OTEL_LOGS_INDEX),
  query: {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: start, lt: end, format: 'epoch_millis' } } },
        // Browser SDKs only: the OTel indices also hold backend services.
        ...termQuery(TELEMETRY_SDK_LANGUAGE, BROWSER_SDK_LANGUAGE),
        ...serviceDocuments(serviceName),
        // As the Overview: the picker lists the environments of the page loads and JS errors too.
        ...termsQuery(OTEL_EVENT_NAME, [EVENT_NAVIGATION_TIMING, EVENT_WEB_VITAL, EVENT_EXCEPTION]),
      ],
    },
  },
  aggs: byEnvironment(environment, {
    lcp: webVital(CORE_WEB_VITAL.lcp),
    inp: webVital(CORE_WEB_VITAL.inp),
    cls: webVital(CORE_WEB_VITAL.cls),
    fcp: webVital(CORE_WEB_VITAL.fcp),
    ttfb: webVital(CORE_WEB_VITAL.ttfb),
  }),
});

/** The vitals and the picker's environments of a `webVitalsSearch` response. */
export const toWebVitalsResult = (
  aggregations?: WebVitalsAggregations
): { webVitals: WebVitals; environments: string[] } => ({
  webVitals: aggregations ? toWebVitals(aggregations.inEnvironment) : NO_WEB_VITALS,
  environments: pickerEnvironments(aggregations),
});
