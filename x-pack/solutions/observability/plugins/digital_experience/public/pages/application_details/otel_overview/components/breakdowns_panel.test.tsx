/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { OverviewFilters } from '../../../../../common/overview_filters';
import type { Breakdowns } from '../../../../../common/types/usage';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { BreakdownsPanel } from './breakdowns_panel';

jest.mock('../../../../hooks/use_kibana_services');

const BREAKDOWNS: Breakdowns = {
  pageLoads: 40,
  browsers: [
    { name: 'Chrome', pageLoads: 30 },
    { name: 'Safari', pageLoads: 10 },
  ],
  operatingSystems: [{ name: 'macOS', pageLoads: 40 }],
  devices: [
    { name: 'iPhone', pageLoads: 30 },
    { name: 'Pixel 8', pageLoads: 10 },
  ],
};

const EMPTY: Breakdowns = { pageLoads: 0, browsers: [], operatingSystems: [], devices: [] };

const sessionsHref = jest.fn((query: Record<string, unknown>) => {
  return `/sessions?${new URLSearchParams(query as never)}`;
});

const onSelectFilter = jest.fn();

const renderPanel = (breakdowns = BREAKDOWNS, isLoading = false, filters: OverviewFilters = {}) => {
  return render(
    <BreakdownsPanel
      breakdowns={breakdowns}
      isLoading={isLoading}
      sessionsHref={sessionsHref}
      filters={filters}
      onSelectFilter={onSelectFilter}
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

describe('BreakdownsPanel', () => {
  it('lists the browsers, operating systems and devices under level-3 headings', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    const browsers = within(screen.getByTestId('digitalExperienceOverviewBrowsers'));
    expect(browsers.getByText('Chrome')).toBeInTheDocument();
    expect(browsers.getByText('30', { selector: 'strong' })).toBeInTheDocument();
    expect(browsers.getByText(/75%/)).toBeInTheDocument();
  });

  it('draws a bar per name for its share of the page loads', () => {
    renderPanel();

    const browsers = within(screen.getByTestId('digitalExperienceOverviewBrowsers'));
    const [chrome] = browsers.getAllByRole('progressbar');
    expect(chrome).toHaveAttribute('value', '30');
    expect(chrome).toHaveAttribute('max', '40');
  });

  it('shares every page load, including those without the attribute', () => {
    renderPanel({ ...BREAKDOWNS, pageLoads: 60 });

    const browsers = within(screen.getByTestId('digitalExperienceOverviewBrowsers'));
    expect(browsers.getByText(/50%/)).toBeInTheDocument();
    expect(browsers.getAllByRole('progressbar')[0]).toHaveAttribute('max', '60');
  });

  it('links each browser and operating system to its sessions', () => {
    renderPanel();

    expect(screen.getByRole('link', { name: 'Sessions on Chrome' })).toHaveAttribute(
      'href',
      '/sessions?browser=Chrome'
    );
    expect(screen.getByRole('link', { name: 'Sessions on macOS' })).toHaveAttribute(
      'href',
      '/sessions?os=macOS'
    );
  });

  it('lists the devices by name, without sessions to open', () => {
    renderPanel();

    const devices = within(screen.getByTestId('digitalExperienceOverviewDevices'));
    expect(devices.getByText('iPhone')).toBeInTheDocument();
    expect(devices.getByText('Pixel 8')).toBeInTheDocument();
    expect(devices.queryByRole('link')).not.toBeInTheDocument();
  });

  it('filters by a browser, an operating system or a device when its row is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Safari' }));
    fireEvent.click(screen.getByRole('button', { name: 'Filter by macOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Filter by Pixel 8' }));

    expect(onSelectFilter.mock.calls).toEqual([
      ['browser', 'Safari'],
      ['os', 'macOS'],
      ['device', 'Pixel 8'],
    ]);
  });

  it('shows the rows the Overview is filtered by as pressed, and offers to take the filter off', () => {
    renderPanel(BREAKDOWNS, false, {
      browser: [{ value: 'Chrome', exclude: false }],
      os: [{ value: 'macOS', exclude: true }],
    });

    expect(screen.getByRole('button', { name: 'Stop filtering by Chrome' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Filter by Safari' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    // An excluded value is not selected: a click includes it instead.
    expect(screen.getByRole('button', { name: 'Filter by macOS' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('shows a spinner while loading', () => {
    renderPanel(EMPTY, true);

    expect(screen.getByTestId('digitalExperienceOverviewBreakdownsLoading')).toBeInTheDocument();
  });

  it('shows the empty state without data', () => {
    renderPanel(EMPTY);

    expect(screen.getByTestId('digitalExperienceOverviewBreakdownsEmpty')).toBeInTheDocument();
  });
});
