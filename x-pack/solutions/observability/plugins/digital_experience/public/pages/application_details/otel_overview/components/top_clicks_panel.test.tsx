/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { TopClick } from '../../../../../common/types/usage';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { TopClicksPanel } from './top_clicks_panel';

jest.mock('../../../../hooks/use_kibana_services');

const CLICKS: TopClick[] = [
  { cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 1200 },
  { cssSelector: '.card', tagName: null, count: 3 },
];

const renderPanel = (clicks = CLICKS, isLoading = false, totalClicks = 1203) => {
  return render(
    <TopClicksPanel clicks={clicks} totalClicks={totalClicks} isLoading={isLoading} />,
    {
      wrapper: EuiProvider,
    }
  );
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('TopClicksPanel', () => {
  it('shows a row per selector with its tag and clicks', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Top clicked elements' })
    ).toBeInTheDocument();
    expect(screen.getByText('#add-to-cart')).toBeInTheDocument();
    expect(screen.getByText('BUTTON')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('.card')).toBeInTheDocument();
  });

  it('shares every click, including those outside the top rows', () => {
    renderPanel([{ cssSelector: '#buy', tagName: null, count: 20 }], false, 200);

    expect(screen.getByText(/10%/)).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    renderPanel(CLICKS, true);

    expect(screen.getByTestId('digitalExperienceOverviewTopClicksLoading')).toBeInTheDocument();
  });

  it('shows the empty state without clicks', () => {
    renderPanel([]);

    expect(screen.getByTestId('digitalExperienceOverviewTopClicksEmpty')).toBeInTheDocument();
  });
});
