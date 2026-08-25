/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { mockProps, mockTiDataSources, mockCtiLinksResponse } from './mock';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { ThreatIntelLinkPanel } from '.';

jest.mock('../../containers/overview_cti_links/use_ti_data_sources');
const useTiDataSourcesMock = useTiDataSources as jest.Mock;
useTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('ThreatIntelLinkPanel', () => {
  it('renders CtiEnabledModule when Threat Intel module is enabled', () => {
    render(
      <TestProviders>
        <ThreatIntelLinkPanel {...mockProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('cti-enabled-module')).toBeInTheDocument();
    expect(screen.queryByTestId('cti-enable-integrations-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('cti-view-indicators')).toBeInTheDocument();
  });

  it('renders CtiDisabledModule when Threat Intel module is disabled', () => {
    render(
      <TestProviders>
        <ThreatIntelLinkPanel {...mockProps} allTiDataSources={[]} />
      </TestProviders>
    );

    expect(screen.getByTestId('cti-disabled-module')).toBeInTheDocument();
  });
});
