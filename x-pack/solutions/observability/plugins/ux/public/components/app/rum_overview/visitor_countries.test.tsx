/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { RumCountryRow } from '../../../../common/rum_app';
import { VisitorCountriesPanel } from './visitor_countries';

jest.mock('./visitor_country_map', () => ({
  VisitorCountryMap: () => <div data-test-subj="uxOverviewCountryMapStub" />,
}));

const isoCodes = [
  'KR',
  'ES',
  'MX',
  'FR',
  'IT',
  'IE',
  'NL',
  'AU',
  'PL',
  'GB',
  'IN',
  'BR',
  'US',
  'JP',
  'CA',
  'CH',
  'SG',
  'SE',
  'DE',
  'ZA',
  'PT',
] as const;

const countries: RumCountryRow[] = isoCodes.map((isoCode, index) => ({
  isoCode,
  name: `Country ${isoCode}`,
  pageViews: 200 - index,
  sessions: 20 - index,
  errorCount: index === 0 ? 1 : 0,
  p75Lcp: 2500,
}));

const renderPanel = () => {
  const history = createMemoryHistory({ initialEntries: ['/'] });
  return render(
    <Router history={history}>
      <VisitorCountriesPanel countries={countries} maxPageViews={200} />
    </Router>
  );
};

describe('VisitorCountriesPanel', () => {
  it('paginates the country list and keeps later rows off the first page', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByTestId('uxOverviewCountry-KR')).toBeInTheDocument();
    expect(screen.getByTestId('uxOverviewCountry-GB')).toBeInTheDocument();
    expect(screen.queryByTestId('uxOverviewCountry-IN')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pagination-button-next'));

    expect(screen.queryByTestId('uxOverviewCountry-KR')).not.toBeInTheDocument();
    expect(screen.getByTestId('uxOverviewCountry-IN')).toBeInTheDocument();
    expect(screen.getByTestId('uxOverviewCountry-ZA')).toBeInTheDocument();
    expect(screen.queryByTestId('uxOverviewCountry-PT')).not.toBeInTheDocument();
  });
});
