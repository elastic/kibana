/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ConnectorField } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { CONNECTOR, CUSTOMIZE_THE_CONNECTOR_AND_ALERTS } from '../translations';

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const mockUseSpaceId = useSpaceId as jest.MockedFunction<typeof useSpaceId>;

const defaultProps = {
  connectorId: 'test-connector-id',
  onConnectorIdSelected: jest.fn(),
};

describe('ConnectorField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpaceId.mockReturnValue('default');
  });

  it('renders the description text', () => {
    render(
      <TestProviders>
        <ConnectorField {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(CUSTOMIZE_THE_CONNECTOR_AND_ALERTS)).toBeInTheDocument();
  });

  it('renders the connector form row label', () => {
    render(
      <TestProviders>
        <ConnectorField {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(CONNECTOR)).toBeInTheDocument();
  });

  it('renders the connectorFieldDescription test subject', () => {
    render(
      <TestProviders>
        <ConnectorField {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('connectorFieldDescription')).toBeInTheDocument();
  });

  it('does not render the description text when showDescription is false', () => {
    render(
      <TestProviders>
        <ConnectorField {...defaultProps} showDescription={false} />
      </TestProviders>
    );

    expect(screen.queryByTestId('connectorFieldDescription')).not.toBeInTheDocument();
    expect(screen.getByText(CONNECTOR)).toBeInTheDocument();
  });

  it('returns null when spaceId is undefined', () => {
    mockUseSpaceId.mockReturnValue(undefined);

    const { container } = render(
      <TestProviders>
        <ConnectorField {...defaultProps} />
      </TestProviders>
    );

    expect(container.querySelector('[data-test-subj="connectorFieldDescription"]')).toBeNull();
  });
});
