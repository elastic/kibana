/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { PrimaryInteractions } from '.';
import { getMockAttackDiscoveryAlerts } from '../../../../mock/mock_attack_discovery_alerts';
import { TestProviders } from '../../../../../../common/mock/test_providers';

jest.mock('../../../../../../common/lib/kibana', () => ({
  useDateFormat: jest.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
  useKibana: jest.fn(() => ({
    services: {
      application: { navigateToUrl: jest.fn() },
    },
  })),
  useToasts: jest.fn(() => ({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  })),
}));

jest.mock('../../../../use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
  })),
}));

jest.mock('../../../../use_find_attack_discoveries', () => ({
  useInvalidateFindAttackDiscoveries: jest.fn(() => jest.fn()),
}));

const defaultProps = {
  attackDiscovery: getMockAttackDiscoveryAlerts()[0],
  isOpen: 'closed' as const,
  isSelected: false,
  setIsOpen: jest.fn(),
  onToggle: jest.fn(),
};

describe('PrimaryInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setIsOpen when toggled', () => {
    const setIsOpenMock = jest.fn();

    render(
      <TestProviders>
        <PrimaryInteractions {...defaultProps} setIsOpen={setIsOpenMock} isOpen={'closed'} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('titleText'));

    expect(setIsOpenMock).toHaveBeenCalledWith('open');
  });

  it('renders with isOpen set to open', () => {
    render(
      <TestProviders>
        <PrimaryInteractions {...defaultProps} isOpen="open" />
      </TestProviders>
    );

    expect(screen.getByTestId('primaryInteractions')).toBeInTheDocument();
  });

  it('calls onToggle when provided', () => {
    const onToggleMock = jest.fn();

    render(
      <TestProviders>
        <PrimaryInteractions {...defaultProps} onToggle={onToggleMock} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('titleText'));

    expect(onToggleMock).toHaveBeenCalledWith('open');
  });

  describe('title and subtitle', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <PrimaryInteractions {...defaultProps} />
        </TestProviders>
      );
    });

    it('renders the title', () => {
      expect(screen.getByTestId('titleText')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      expect(screen.getByTestId('subtitle')).toBeInTheDocument();
    });
  });
});
