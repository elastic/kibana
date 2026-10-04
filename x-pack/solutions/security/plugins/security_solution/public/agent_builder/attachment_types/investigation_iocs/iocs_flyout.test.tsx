/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationIocsFlyout } from './iocs_flyout';

const renderFlyout = () =>
  render(
    <I18nProvider>
      <InvestigationIocsFlyout
        categories={[
          {
            id: 'shas',
            typeLabel: 'SHA256',
            shortLabel: 'SHAs',
            items: [{ value: 'a3f5c9d1e8b74620' }],
          },
          {
            id: 'ips',
            typeLabel: 'IP addresses',
            shortLabel: 'IPs',
            items: [
              { value: '185.220.101.42', comment: 'C2 contacted by FIN-DB-02' },
              { value: '10.0.0.10' },
            ],
          },
        ]}
      />
    </I18nProvider>
  );

describe('InvestigationIocsFlyout', () => {
  it('lists each populated category and a copyable value', () => {
    renderFlyout();

    expect(screen.getByRole('heading', { name: 'IOCs' })).toBeInTheDocument();
    expect(screen.getByTestId('investigationIocsFlyout')).toHaveClass('euiFlyoutBody');
    expect(screen.getByRole('heading', { name: 'SHA256' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IP addresses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy a3f5c9d1e8b74620' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy 185.220.101.42' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy 10.0.0.10' })).toBeInTheDocument();
  });

  it('shows an indicator comment in a tooltip', async () => {
    renderFlyout();

    await userEvent.hover(screen.getByRole('button', { name: 'Copy 185.220.101.42' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('C2 contacted by FIN-DB-02');
  });
});
