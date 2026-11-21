/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { FrustratedElement, FrustratedPage } from '../../../../../common/types/usage';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import type { SessionsListUrlQuery } from '../../../../utils/sessions_list_query';
import { EDOT_BROWSER_DOCS_URL } from '../../../../utils/doc_links';
import { FrustrationPanel } from './frustration_panel';

jest.mock('../../../../hooks/use_kibana_services');

const ELEMENTS: FrustratedElement[] = [
  {
    cssSelector: '#checkout',
    tagName: 'BUTTON',
    sessions: 12,
    topPage: '/cart',
    rageClicks: 10,
    deadClicks: 0,
    errorClicks: 4,
    total: 14,
  },
  {
    cssSelector: '.promo',
    tagName: null,
    sessions: 3,
    topPage: null,
    rageClicks: 0,
    deadClicks: 5,
    errorClicks: 0,
    total: 5,
  },
];

const PAGES: FrustratedPage[] = [
  {
    page: '/cart',
    sessions: 15,
    rageClicks: 10,
    deadClicks: 2,
    errorClicks: 4,
    total: 16,
  },
];

const FRUSTRATION = { rageClicks: 10, deadClicks: 7, errorClicks: 4, total: 21, sessions: 20 };
const NO_FRUSTRATION = { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0, sessions: 0 };

const sessionsHref = (query: SessionsListUrlQuery) => {
  return `/sessions?${new URLSearchParams(
    Object.entries(query).map(([name, value]) => [name, String(value)])
  )}`;
};

const renderPanel = ({
  frustration = FRUSTRATION,
  elements = ELEMENTS,
  pages = PAGES,
  isLoading = false,
}: {
  frustration?: typeof FRUSTRATION;
  elements?: FrustratedElement[];
  pages?: FrustratedPage[];
  isLoading?: boolean;
} = {}) => {
  return render(
    <FrustrationPanel
      frustration={frustration}
      frustratedElements={elements}
      frustratedPages={pages}
      isLoading={isLoading}
      sessionsHref={sessionsHref}
    />,
    { wrapper: EuiProvider }
  );
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('FrustrationPanel', () => {
  it('summarizes the signals and sessions in the header', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'Frustration' })).toBeInTheDocument();
    expect(screen.getByText('21 signals in 20 sessions')).toBeInTheDocument();
  });

  it('shows a row per element with its tag, page and exact sessions', () => {
    renderPanel();

    const row = screen.getByTestId('digitalExperienceOverviewFrustrationRow-#checkout');
    expect(within(row).getByText('#checkout')).toBeInTheDocument();
    expect(within(row).getByText('BUTTON')).toBeInTheDocument();
    expect(within(row).getByText(/\/cart/)).toBeInTheDocument();
    expect(within(row).getByText('12 sessions')).toBeInTheDocument();
    expect(
      screen.getByTestId('digitalExperienceOverviewFrustrationRow-.promo')
    ).toBeInTheDocument();
  });

  it('skips the badges of a type without signals', () => {
    renderPanel();

    const checkout = screen.getByTestId('digitalExperienceOverviewFrustrationRow-#checkout');
    expect(within(checkout).getByText('10 rage')).toBeInTheDocument();
    expect(within(checkout).getByText('4 error')).toBeInTheDocument();
    expect(within(checkout).queryByText(/dead/)).not.toBeInTheDocument();

    const promo = screen.getByTestId('digitalExperienceOverviewFrustrationRow-.promo');
    expect(within(promo).getByText('5 dead')).toBeInTheDocument();
    expect(within(promo).queryByText(/rage|error/)).not.toBeInTheDocument();
  });

  it('shows a row per page with its sessions as a lower bound', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFrustrationPagesTab'));

    const row = screen.getByTestId('digitalExperienceOverviewFrustrationRow-/cart');
    expect(within(row).getByText('/cart')).toBeInTheDocument();
    expect(within(row).getByText('at least 15 sessions')).toBeInTheDocument();
    expect(within(row).getByText('2 dead')).toBeInTheDocument();
    expect(
      screen.queryByTestId('digitalExperienceOverviewFrustrationRow-#checkout')
    ).not.toBeInTheDocument();
  });

  it('opens the sessions of an element with the frustration target', () => {
    renderPanel();

    const href = screen
      .getByTestId('digitalExperienceOverviewFrustrationSessionsLink-#checkout')
      .getAttribute('href');

    const params = new URLSearchParams(href?.split('?')[1]);
    expect(params.get('withFrustration')).toBe('true');
    expect(params.get('frustrationTarget')).toBe('#checkout');
    expect(params.has('frustrationPage')).toBe(false);
  });

  it('opens the sessions of a page with the frustration page', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFrustrationPagesTab'));

    const href = screen
      .getByTestId('digitalExperienceOverviewFrustrationSessionsLink-/cart')
      .getAttribute('href');

    const params = new URLSearchParams(href?.split('?')[1]);
    expect(params.get('withFrustration')).toBe('true');
    expect(params.get('frustrationPage')).toBe('/cart');
    expect(params.has('frustrationTarget')).toBe(false);
  });

  it('explains the signals in a tooltip', async () => {
    renderPanel();

    fireEvent.mouseOver(screen.getByText('What counts as a frustration signal'));

    expect(await screen.findByText(/3 or more clicks on the same element/)).toBeInTheDocument();
    expect(screen.getByText(/no page reaction within 1 second/)).toBeInTheDocument();
    expect(screen.getByText(/followed by a JavaScript error/)).toBeInTheDocument();
  });

  it('shows the empty state with the docs link without signals', () => {
    renderPanel({ frustration: NO_FRUSTRATION, elements: [], pages: [] });

    expect(screen.getByTestId('digitalExperienceOverviewFrustrationEmpty')).toHaveTextContent(
      'No frustration signals. Rage, dead and error clicks need EDOT Browser with frustration detection.'
    );
    expect(screen.getByTestId('digitalExperienceOverviewFrustrationDocsLink')).toHaveAttribute(
      'href',
      EDOT_BROWSER_DOCS_URL
    );
    expect(
      screen.queryByTestId('digitalExperienceOverviewFrustrationElementsTab')
    ).not.toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    renderPanel({ isLoading: true });

    expect(screen.getByTestId('digitalExperienceOverviewFrustrationLoading')).toBeInTheDocument();
  });
});
