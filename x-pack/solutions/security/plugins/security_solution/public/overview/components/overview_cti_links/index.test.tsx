/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ThreatIntelLinkPanel } from '.';

import { TestProviders } from '../../../common/mock';
import { mockProps, mockTiDataSources, mockCtiLinksResponse } from './mock';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';

jest.mock('../../containers/overview_cti_links/use_ti_data_sources');
const useTiDataSourcesMock = useTiDataSources as jest.Mock;
useTiDataSourcesMock.mockReturnValue(mockTiDataSources);

jest.mock('../../containers/overview_cti_links');
const useCtiDashboardLinksMock = useCtiDashboardLinks as jest.Mock;
useCtiDashboardLinksMock.mockReturnValue(mockCtiLinksResponse);

describe('ThreatIntelLinkPanel', () => {
  it('renders CtiEnabledModule when Threat Intel module is enabled', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatIntelLinkPanel {...mockProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="cti-enabled-module"]').length).toEqual(1);
    expect(wrapper.find('[data-test-subj="cti-enable-integrations-button"]').length).toEqual(0);
    expect(wrapper.find('[data-test-subj="cti-view-indicators"]').length).toBeGreaterThan(0);
  });

  it('renders CtiDisabledModule when Threat Intel module is disabled', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatIntelLinkPanel {...mockProps} allTiDataSources={[]} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="cti-disabled-module"]').length).toEqual(1);
  });
});
