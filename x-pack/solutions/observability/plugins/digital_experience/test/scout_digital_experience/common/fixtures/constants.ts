/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';

export const ES_ARCHIVES = {
  RUM_TEST_DATA: 'x-pack/solutions/observability/plugins/ux/e2e/fixtures/rum_test_data',
};

export const TIME_RANGE = {
  rangeFrom: '2021-01-18T12:00:00.000Z',
  rangeTo: '2021-01-18T13:00:00.000Z',
};

/**
 * Has page loads in both sources inside `TIME_RANGE`: Classic RUM in `RUM_TEST_DATA` and EDOT
 * Browser in the mock OTel data.
 */
export const SERVICE_NAME = 'elastic-co-frontend';

/** The other EDOT Browser applications of the mock OTel data (`otel_rum_data.ndjson`). */
export const OTEL_APPS = {
  shop: 'otel-shop',
  checkout: 'otel-checkout',
  /** The only one in `STAGING_ENVIRONMENT`. */
  docs: 'otel-docs',
  /** The only one without an environment ("Not defined"). */
  blog: 'otel-blog',
} as const;

/** The page loads of `OTEL_APPS.shop` inside `TIME_RANGE`, as its Overview KPI shows them. */
export const OTEL_SHOP_PAGE_LOADS = '4';

export const STAGING_ENVIRONMENT = 'staging';

export const createRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

export const DIGITAL_EXPERIENCE_READ_ROLE = createRole({
  digital_experience: ['read'],
  apm: ['read'],
});

/** Digital Experience without APM, whose routes the app reads its data through. */
export const DIGITAL_EXPERIENCE_ONLY_ROLE = createRole({ digital_experience: ['read'] });

/** An existing APM user that was never granted Digital Experience. */
export const APM_ONLY_ROLE = createRole({ apm: ['read'] });
