/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { ServicePanelHeader } from './header';
import { mockObservedService } from './mocks';

const mockProps = {
  serviceName: 'test',
  observedService: mockObservedService,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('ServicePanelHeader', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ServicePanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header')).toBeInTheDocument();
  });

  it('renders observed badge when lastSeen is defined', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ServicePanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-observed-badge')).toBeInTheDocument();
  });

  it('does not render observed badge when lastSeen date is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ServicePanelHeader
          {...{
            ...mockProps,
            observedService: {
              ...mockObservedService,
              lastSeen: {
                isLoading: false,
                date: undefined,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('service-panel-header-observed-badge')).not.toBeInTheDocument();
  });
});
