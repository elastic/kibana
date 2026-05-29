/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../common/constants';
import { EmptyPage } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('EmptyPage', () => {
  const mockOnCreateClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: true,
            },
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  it('renders the empty schedule state', () => {
    render(
      <TestProviders>
        <EmptyPage onCreateClick={mockOnCreateClick} />
      </TestProviders>
    );

    expect(screen.getByTestId('emptySchedule')).toBeInTheDocument();
  });

  it('renders the create button', () => {
    render(
      <TestProviders>
        <EmptyPage onCreateClick={mockOnCreateClick} />
      </TestProviders>
    );

    expect(screen.getByTestId('createSchedule')).toBeInTheDocument();
  });

  it('calls onCreateClick when the create button is clicked', () => {
    render(
      <TestProviders>
        <EmptyPage onCreateClick={mockOnCreateClick} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('createSchedule'));

    expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT render a CreateFlyout (flyout is managed by the parent)', () => {
    render(
      <TestProviders>
        <EmptyPage onCreateClick={mockOnCreateClick} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('createSchedule'));

    expect(screen.queryByTestId('scheduleCreateFlyout')).not.toBeInTheDocument();
  });

  it('renders the learn more link', () => {
    render(
      <TestProviders>
        <EmptyPage onCreateClick={mockOnCreateClick} />
      </TestProviders>
    );

    expect(screen.getByTestId('learnMoreLink')).toBeInTheDocument();
  });
});
