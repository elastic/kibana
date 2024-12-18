/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscovery } from '../../../../mock/mock_attack_discovery';
import { TakeAction } from '.';

describe('TakeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestProviders>
        <TakeAction attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const takeActionButtons = screen.getAllByTestId('takeActionPopoverButton');

    fireEvent.click(takeActionButtons[0]); // open the popover
  });

  it('renders the Add to new case action', () => {
    const addToCase = screen.getByTestId('addToCase');

    expect(addToCase).toBeInTheDocument();
  });

  it('renders the Add to existing case action', () => {
    const addToCase = screen.getByTestId('addToExistingCase');

    expect(addToCase).toBeInTheDocument();
  });

  it('renders the View in AI Assistant action', () => {
    const addToCase = screen.getByTestId('viewInAiAssistant');

    expect(addToCase).toBeInTheDocument();
  });
});
