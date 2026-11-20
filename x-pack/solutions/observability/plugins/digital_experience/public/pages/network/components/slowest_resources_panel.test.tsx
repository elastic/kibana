/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { SlowResource } from '../../../../common/types/network';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { SlowestResourcesPanel } from './slowest_resources_panel';

jest.mock('../../../hooks/use_kibana_services');

const RESOURCES: SlowResource[] = [
  {
    url: 'https://cdn.example.com/app.js',
    initiatorType: 'script',
    renderBlocking: true,
    count: 3,
    p75Ms: 1800,
    transferSizeP75Bytes: 4096,
  },
  {
    url: 'https://cdn.example.com/logo.svg',
    initiatorType: null,
    renderBlocking: false,
    count: 1,
    p75Ms: null,
    transferSizeP75Bytes: null,
  },
];

const renderPanel = (resources = RESOURCES, isLoading = false) => {
  return render(<SlowestResourcesPanel resources={resources} isLoading={isLoading} />, {
    wrapper: EuiProvider,
  });
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('SlowestResourcesPanel', () => {
  it('shows a row per resource with its type, duration and transfer size', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Slowest resources' })
    ).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.com/app.js')).toBeInTheDocument();
    expect(screen.getByText('script')).toBeInTheDocument();
    expect(screen.getByText('1.80 s')).toBeInTheDocument();
    expect(screen.getByText('4 KB')).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.com/logo.svg')).toBeInTheDocument();
  });

  it('flags only the render-blocking resources', () => {
    renderPanel();

    const badges = screen.getAllByTestId('digitalExperienceNetworkRenderBlocking');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('Render-blocking');
  });

  it('filters the loaded rows to the render-blocking ones, without reloading', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('digitalExperienceNetworkRenderBlockingFilter'));

    expect(screen.getByTestId('digitalExperienceNetworkRenderBlockingFilter')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('https://cdn.example.com/app.js')).toBeInTheDocument();
    expect(screen.queryByText('https://cdn.example.com/logo.svg')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('says so when none of the loaded resources is render-blocking', () => {
    renderPanel([RESOURCES[1]]);

    fireEvent.click(screen.getByTestId('digitalExperienceNetworkRenderBlockingFilter'));

    expect(screen.getByText('None of these resources is render-blocking.')).toBeInTheDocument();
  });

  it('pages through the resources ten at a time', () => {
    const many = Array.from({ length: 12 }, (_, index) => {
      return {
        ...RESOURCES[1],
        url: `https://cdn.example.com/image-${index}.png`,
        p75Ms: 100 - index,
      };
    });
    renderPanel(many);

    expect(screen.getByText('https://cdn.example.com/image-0.png')).toBeInTheDocument();
    expect(screen.queryByText('https://cdn.example.com/image-11.png')).not.toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    renderPanel(RESOURCES, true);

    expect(
      screen.getByTestId('digitalExperienceNetworkSlowestResourcesLoading')
    ).toBeInTheDocument();
  });

  it('shows the empty state without resources', () => {
    renderPanel([]);

    expect(screen.getByTestId('digitalExperienceNetworkSlowestResourcesEmpty')).toBeInTheDocument();
  });
});
