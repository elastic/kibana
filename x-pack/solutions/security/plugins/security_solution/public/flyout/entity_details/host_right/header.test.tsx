/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { HostPanelHeader } from './header';
import { mockObservedHostData } from '../mocks';

const mockProps = {
  hostName: 'test',
  observedHost: mockObservedHostData,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('HostPanelHeader', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HostPanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header')).toBeInTheDocument();
  });

  it('renders observed date', () => {
    const futureDay = '2989-03-07T20:00:00.000Z';
    const { getByTestId } = render(
      <TestProviders>
        <HostPanelHeader
          {...{
            ...mockProps,
            observedHost: {
              ...mockObservedHostData,
              lastSeen: {
                isLoading: false,
                date: futureDay,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header-lastSeen').textContent).toContain('Mar 7, 2989');
  });

  it('renders observed badge when lastSeen is defined', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HostPanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header-observed-badge')).toBeInTheDocument();
  });

  it('does not render observed badge when lastSeen date is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <HostPanelHeader
          {...{
            ...mockProps,
            observedHost: {
              ...mockObservedHostData,
              lastSeen: {
                isLoading: false,
                date: undefined,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('host-panel-header-observed-badge')).not.toBeInTheDocument();
  });
});
