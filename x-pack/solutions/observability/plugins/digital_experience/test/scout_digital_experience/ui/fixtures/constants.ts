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

// Service with RUM page loads in `RUM_TEST_DATA`, inside `TIME_RANGE`.
export const SERVICE_NAME = 'elastic-co-frontend';

export const TIME_RANGE = {
  rangeFrom: '2021-01-18T12:00:00.000Z',
  rangeTo: '2021-01-18T13:00:00.000Z',
};

const createRole = (feature: KibanaRole['kibana'][number]['feature']): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature, spaces: ['*'] }],
});

export const DIGITAL_EXPERIENCE_READ_ROLE = createRole({
  digital_experience: ['read'],
  apm: ['read'],
});

// Digital Experience without APM, whose routes the app reads its data through.
export const DIGITAL_EXPERIENCE_ONLY_ROLE = createRole({ digital_experience: ['read'] });

// An existing APM user that was never granted Digital Experience.
export const APM_ONLY_ROLE = createRole({ apm: ['read'] });
