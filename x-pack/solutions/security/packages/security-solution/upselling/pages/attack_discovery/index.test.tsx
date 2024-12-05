/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AttackDiscoveryUpsellingPage } from '.';

const availabilityMessage = 'This feature is available...';
const upgradeMessage = 'Please upgrade...';

const mockActions = <div data-test-subj="mockActions" />;

jest.mock('@kbn/security-solution-navigation', () => {
  const original = jest.requireActual('@kbn/security-solution-navigation');
  return {
    ...original,
    useNavigation: () => ({
      navigateTo: jest.fn(),
    }),
  };
});

describe('AttackDiscoveryUpsellingPage', () => {
  beforeEach(() => {
    render(
      <AttackDiscoveryUpsellingPage
        actions={mockActions}
        availabilityMessage={availabilityMessage}
        upgradeMessage={upgradeMessage}
      />
    );
  });

  it('renders the availability message', () => {
    const attackDiscoveryIsAvailable = screen.getByTestId('availabilityMessage');

    expect(attackDiscoveryIsAvailable).toHaveTextContent(availabilityMessage);
  });

  it('renders the upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(upgradeMessage);
  });

  it('renders the actions', () => {
    const actions = screen.getByTestId('mockActions');

    expect(actions).toBeInTheDocument();
  });
});
