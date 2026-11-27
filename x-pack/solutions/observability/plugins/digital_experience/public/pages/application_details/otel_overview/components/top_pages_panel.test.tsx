/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { TopPage } from '../../../../../common/types/usage';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { TopPagesPanel } from './top_pages_panel';

jest.mock('../../../../hooks/use_kibana_services');

const NO_SIGNALS = { lcpP75Ms: null, inpP75Ms: null, clsP75: null, jsErrors: null };

const PAGES: TopPage[] = [
  { url: 'https://shop.example.com/', pageLoads: 1533, loadTimeP75Ms: 2412.5, ...NO_SIGNALS },
  {
    url: 'https://shop.example.com/cart?step=2',
    pageLoads: 40,
    loadTimeP75Ms: null,
    ...NO_SIGNALS,
  },
];

const onSelectPage = jest.fn();

const renderPanel = (pages = PAGES, isLoading = false, selectedUrls: string[] = []) => {
  return render(
    <TopPagesPanel
      pages={pages}
      isLoading={isLoading}
      selectedUrls={selectedUrls}
      onSelectPage={onSelectPage}
    />,
    { wrapper: EuiProvider }
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('TopPagesPanel', () => {
  it('shows a level-2 heading and a row per page with its page loads and load time', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'Top pages' })).toBeInTheDocument();
    expect(screen.getByText('1,533')).toBeInTheDocument();
    expect(screen.getByText('2.41 s')).toBeInTheDocument();
  });

  it('colors the web vitals of a page by their rating, and shows its JS errors', () => {
    renderPanel([
      {
        url: '/products/{slug}',
        pageLoads: 148,
        loadTimeP75Ms: 2080,
        lcpP75Ms: 2100,
        inpP75Ms: 260,
        clsP75: 0.31,
        jsErrors: 12,
      },
    ]);

    expect(screen.getByTestId('digitalExperienceTopPageVital-lcp')).toHaveTextContent('2.10 s');
    expect(screen.getByTestId('digitalExperienceTopPageVital-lcp')).toHaveAttribute(
      'data-rating',
      'good'
    );
    expect(screen.getByTestId('digitalExperienceTopPageVital-inp')).toHaveAttribute(
      'data-rating',
      'needsImprovement'
    );
    expect(screen.getByTestId('digitalExperienceTopPageVital-cls')).toHaveTextContent('0.310');
    expect(screen.getByTestId('digitalExperienceTopPageVital-cls')).toHaveAttribute(
      'data-rating',
      'poor'
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('leaves the vitals and errors empty for a page without them, e.g. without a route', () => {
    renderPanel([PAGES[0]]);

    expect(screen.queryByTestId('digitalExperienceTopPageVital-lcp')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'JS errors' })).toBeInTheDocument();
  });

  it('labels each page like the sessions do, with its full URL in the title', () => {
    renderPanel([
      ...PAGES,
      {
        url: 'https://shop.example.com/#/checkout?step=2',
        pageLoads: 3,
        loadTimeP75Ms: null,
        ...NO_SIGNALS,
      },
    ]);

    expect(screen.getByText('/cart')).toBeInTheDocument();
    expect(screen.getByTitle('https://shop.example.com/cart?step=2')).toBeInTheDocument();
    expect(screen.getByText('/checkout')).toBeInTheDocument();
  });

  it('filters by a page, with its full URL, when its row is clicked', () => {
    renderPanel();

    fireEvent.click(
      screen.getByRole('button', { name: 'Filter by https://shop.example.com/cart?step=2' })
    );

    expect(onSelectPage).toHaveBeenCalledWith('https://shop.example.com/cart?step=2');
  });

  it('shows the pages the Overview is filtered by as pressed, and offers to take them off', () => {
    renderPanel(PAGES, false, ['https://shop.example.com/']);

    expect(
      screen.getByRole('button', { name: 'Stop filtering by https://shop.example.com/' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Filter by https://shop.example.com/cart?step=2' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows a spinner, not the rows, while loading', () => {
    renderPanel(PAGES, true);

    expect(screen.getByTestId('digitalExperienceOverviewTopPagesLoading')).toBeInTheDocument();
    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
  });

  it('shows the empty state without pages', () => {
    renderPanel([]);

    expect(screen.getByTestId('digitalExperienceOverviewTopPagesEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceOverviewTopPagesDocsLink')).toHaveAttribute(
      'target',
      '_blank'
    );
  });
});
