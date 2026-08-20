/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { UxDefaultDateRange } from './use_date_range_redirect';

const renderWithHistory = (search: string) => {
  const history = createMemoryHistory({ initialEntries: [`/${search}`] });
  const view = render(
    <Router history={history}>
      <UxDefaultDateRange>
        <div>ready</div>
      </UxDefaultDateRange>
    </Router>
  );
  return { history, ...view };
};

describe('UxDefaultDateRange', () => {
  it('writes last 7 days when the URL has no range', () => {
    const { history } = renderWithHistory('');
    expect(history.location.search).toBe('?rangeFrom=now-7d&rangeTo=now');
  });

  it('leaves an existing range alone', () => {
    const { history, getByText } = renderWithHistory('?rangeFrom=now-24h&rangeTo=now');
    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
    expect(getByText('ready')).toBeInTheDocument();
  });
});
