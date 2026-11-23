/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource, ApplicationSummary } from '../../../../common/types/applications';
import { filterApplications } from './filter_applications';

const app = (serviceName: string, source: ApplicationSource) =>
  ({ serviceName, source } as ApplicationSummary);

const applications = [
  app('shop', 'otel'),
  app('shop', 'classic'),
  app('docs', 'classic'),
  app('Checkout', 'otel'),
];

const rowsOf = (...args: Parameters<typeof filterApplications>) =>
  filterApplications(...args).map(
    ({ serviceName, source, hasClassicData }) =>
      `${serviceName}:${source}${hasClassicData ? ' (+classic)' : ''}`
  );

describe('filterApplications', () => {
  it('shows one EDOT Browser row for a name with both sources, flagged', () => {
    expect(rowsOf({ applications, source: undefined, search: '' })).toEqual([
      'shop:otel (+classic)',
      'docs:classic',
      'Checkout:otel',
    ]);
  });

  it('shows the rows of one source as they are', () => {
    expect(rowsOf({ applications, source: 'classic', search: '' })).toEqual([
      'shop:classic',
      'docs:classic',
    ]);
    expect(rowsOf({ applications, source: 'otel', search: '' })).toEqual([
      'shop:otel',
      'Checkout:otel',
    ]);
  });

  it('searches names, ignoring case and surrounding spaces', () => {
    expect(rowsOf({ applications, source: undefined, search: '  CHECK ' })).toEqual([
      'Checkout:otel',
    ]);
  });
});
