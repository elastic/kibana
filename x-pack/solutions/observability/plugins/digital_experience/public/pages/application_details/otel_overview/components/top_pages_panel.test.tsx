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

const PAGES: TopPage[] = [
  { url: 'https://shop.example.com/', pageLoads: 1533, loadTimeP75Ms: 2412.5 },
  { url: 'https://shop.example.com/cart?step=2', pageLoads: 40, loadTimeP75Ms: null },
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

  it('labels each page like the sessions do, with its full URL in the title', () => {
    renderPanel([
      ...PAGES,
      { url: 'https://shop.example.com/#/checkout?step=2', pageLoads: 3, loadTimeP75Ms: null },
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
