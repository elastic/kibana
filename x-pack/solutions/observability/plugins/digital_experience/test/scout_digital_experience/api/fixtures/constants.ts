/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE } from '../../common/fixtures/constants';

export * from '../../common/fixtures/constants';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const APPLICATIONS_PATH = 'internal/digital_experience/applications';

/**
 * A route of one application's tab in `TIME_RANGE`, e.g. `usage`, optionally of one
 * environment.
 */
export const applicationTabPath = (
  serviceName: string,
  tabPath: 'usage' | 'errors' | 'network',
  environment?: string
): string => {
  const query = new URLSearchParams({
    start: TIME_RANGE.rangeFrom,
    end: TIME_RANGE.rangeTo,
    ...(environment ? { environment } : {}),
  });
  return `${APPLICATIONS_PATH}/${encodeURIComponent(serviceName)}/${tabPath}?${query}`;
};

export const APPLICATIONS_IN_TIME_RANGE_PATH = `${APPLICATIONS_PATH}?start=${TIME_RANGE.rangeFrom}&end=${TIME_RANGE.rangeTo}`;

export const SESSIONS_ENABLE_PATH = 'internal/digital_experience/sessions/enable';
