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

export const getFilterForTestNowRun = (exclude?: boolean) => {
  const pkg = 'ingest-package-policies';

  let filter = `${pkg}.package.name:synthetics and ${pkg}.is_managed:true`;
  const lightweight = `${pkg}.name: ${LIGHTWEIGHT_TEST_NOW_RUN}`;
  const browser = `${pkg}.name: ${BROWSER_TEST_NOW_RUN}`;
  filter = exclude
    ? `${filter} and not (${lightweight} or ${browser})`
    : `${filter} and (${lightweight} or ${browser})`;
  return filter;
};
