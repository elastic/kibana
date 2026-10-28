/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertsPagePath } from '@kbn/securitysolution-alerts-page-url';
import { URL_PARAM_KEY } from './constants';

describe('URL_PARAM_KEY', () => {
  // The package keeps its own copy of these names. Renaming one here must fail this test.
  it('matches the parameter names `buildAlertsPagePath` puts in the Alerts page URL', () => {
    const path = buildAlertsPagePath(['a'], '2026-09-01T00:00:00.000Z');

    expect([...new URLSearchParams(path).keys()]).toEqual([
      URL_PARAM_KEY.filters,
      URL_PARAM_KEY.timerange,
      URL_PARAM_KEY.pageFilter,
    ]);
  });
});
