/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { longTaskMetricsQuery } from './long_task_metrics_query';

describe('longTaskMetricsQuery', () => {
  it('fetches long task metrics', () => {
    const query = longTaskMetricsQuery(0, 50000, 50, '', {
      environment: 'ENVIRONMENT_ALL',
    });
    expect(query).toMatchSnapshot();
  });
});
