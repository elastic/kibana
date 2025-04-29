/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsErrorsQuery } from './js_errors_query';

describe('jsErrorsQuery', () => {
  it('fetches js errors', () => {
    const query = jsErrorsQuery(0, 50000, 5, 0, '', {
      environment: 'ENVIRONMENT_ALL',
    });
    expect(query).toMatchSnapshot();
  });
});
