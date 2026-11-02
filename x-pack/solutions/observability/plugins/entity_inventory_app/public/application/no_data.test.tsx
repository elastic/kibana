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
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ENTITY_INVENTORY_PAGES } from '../pages';
import type { EntityInventoryPage } from '../pages';
import { NoData } from './no_data';

const [ALL_RESOURCES, HOSTS, KUBERNETES] = ENTITY_INVENTORY_PAGES;

const getRedirectUrl = jest.fn(
  ({ source }: { source?: string }) => `/app/observabilityOnboarding/${source ?? ''}`
);

const share = {
  url: { locators: { get: () => ({ getRedirectUrl }) } },
} as unknown as SharePluginStart;

const shareWithoutLocator = {
  url: { locators: { get: () => undefined } },
} as unknown as SharePluginStart;

const application = {
  getUrlForApp: (appId: string, { path }: { path?: string } = {}) => `/base/app/${appId}${path}`,
} as unknown as CoreStart['application'];

const renderNoData = (page: EntityInventoryPage, shareStart: SharePluginStart = share) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ share: shareStart, application }}>
          <NoData page={page} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('NoData', () => {
  beforeEach(() => {
    getRedirectUrl.mockClear();
  });

  it('renders the title and the description', () => {
    renderNoData(ALL_RESOURCES);

    expect(screen.getByRole('heading', { name: 'Add Observability data' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connect your systems and get full visibility into logs, metrics, and traces.'
      )
    ).toBeInTheDocument();
  });

  it.each([
    [ALL_RESOURCES, {}, '/app/observabilityOnboarding/'],
    [HOSTS, {}, '/app/observabilityOnboarding/'],
    [KUBERNETES, { source: 'kubernetes' }, '/app/observabilityOnboarding/kubernetes'],
  ])('builds the add data link of %j with the onboarding params %j', (page, params, href) => {
    renderNoData(page);

    expect(getRedirectUrl).toHaveBeenCalledWith(params);
    expect(screen.getByTestId('entityInventoryNoDataAddDataButton')).toHaveAttribute('href', href);
  });

  it('links the add data button to the integrations page when the onboarding locator is not available', () => {
    renderNoData(HOSTS, shareWithoutLocator);

    expect(screen.getByTestId('entityInventoryNoDataAddDataButton')).toHaveAttribute(
      'href',
      '/base/app/integrations/browse'
    );
  });

  it.each([
    [ALL_RESOURCES, 'all'],
    [HOSTS, 'hosts'],
    [KUBERNETES, 'kubernetes'],
  ])('tracks the add data click of %j with the entity category %s', (page, entityCategory) => {
    renderNoData(page);

    const button = screen.getByTestId('entityInventoryNoDataAddDataButton');
    expect(button).toHaveAttribute('data-ebt-action', 'addData');
    expect(button).toHaveAttribute('data-ebt-element', 'entityInventoryNoData');
    expect(button).toHaveAttribute('data-ebt-detail', entityCategory);
  });
});
