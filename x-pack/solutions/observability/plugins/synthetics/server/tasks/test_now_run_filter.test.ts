/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { getFilterForTestNowRun } from './test_now_run_filter';

describe('getFilterForTestNowRun', () => {
  it('selects only Test Now package policies', () => {
    expect(getFilterForTestNowRun()).toBe(
      'ingest-package-policies.package.name:synthetics and ingest-package-policies.is_managed:true' +
        ` and (ingest-package-policies.name: ${LIGHTWEIGHT_TEST_NOW_RUN} or ingest-package-policies.name: ${BROWSER_TEST_NOW_RUN})`
    );
  });

  it('excludes Test Now policies from leftover scans', () => {
    expect(getFilterForTestNowRun(true)).toBe(
      'ingest-package-policies.package.name:synthetics and ingest-package-policies.is_managed:true' +
        ` and not (ingest-package-policies.name: ${LIGHTWEIGHT_TEST_NOW_RUN} or ingest-package-policies.name: ${BROWSER_TEST_NOW_RUN})`
    );
  });
});
