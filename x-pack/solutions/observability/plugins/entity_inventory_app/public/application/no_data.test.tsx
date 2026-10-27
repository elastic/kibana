/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { EntityInventoryCategory } from '../pages';
import { NoData } from './no_data';

const renderNoData = (
  addDataHref = '/app/observabilityOnboarding/',
  entityCategory: EntityInventoryCategory = 'all'
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <NoData addDataHref={addDataHref} entityCategory={entityCategory} />
      </EuiProvider>
    </I18nProvider>
  );

describe('NoData', () => {
  it('renders the title and the description', () => {
    renderNoData();

    expect(screen.getByRole('heading', { name: 'Add Observability data' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connect your systems and get full visibility into logs, metrics, and traces.'
      )
    ).toBeInTheDocument();
  });

  it('links the add data button to the given href', () => {
    renderNoData('/app/observabilityOnboarding/kubernetes');

    expect(screen.getByTestId('entityInventoryNoDataAddDataButton')).toHaveAttribute(
      'href',
      '/app/observabilityOnboarding/kubernetes'
    );
  });

  it('tracks the add data click with the entity category of the page', () => {
    renderNoData('/app/observabilityOnboarding/', 'hosts');

    const button = screen.getByTestId('entityInventoryNoDataAddDataButton');
    expect(button).toHaveAttribute('data-ebt-action', 'addData');
    expect(button).toHaveAttribute('data-ebt-element', 'entityInventoryNoData');
    expect(button).toHaveAttribute('data-ebt-detail', 'hosts');
  });
});
