/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { PrimaryInteractions } from '.';
import { getMockAttackDiscoveryAlerts } from '../../../../mock/mock_attack_discovery_alerts';
import { TestProviders } from '../../../../../../common/mock/test_providers';

vi.mock('../../../../../../common/lib/kibana', () => {
  const mocked = {
    useDateFormat: vi.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
    useKibana: vi.fn(() => ({
      services: {
        application: { navigateToUrl: vi.fn() },
      },
    })),
    useToasts: vi.fn(() => ({
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      addInfo: vi.fn(),
      remove: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../use_attack_discovery_bulk', () => {
  const mocked = {
    useAttackDiscoveryBulk: vi.fn(() => ({
      mutate: vi.fn(),
      isLoading: false,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../use_find_attack_discoveries', () => {
  const mocked = {
    useInvalidateFindAttackDiscoveries: vi.fn(() => vi.fn()),
  };
  return { ...mocked, default: mocked };
});

const defaultProps = {
  attackDiscovery: getMockAttackDiscoveryAlerts()[0],
  isOpen: 'closed' as const,
  isSelected: false,
  setIsOpen: vi.fn(),
  onToggle: vi.fn(),
};

describe('PrimaryInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls setIsOpen when toggled', () => {
    const setIsOpenMock = vi.fn();

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
    const onToggleMock = vi.fn();

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
