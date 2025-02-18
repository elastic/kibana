/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AttackDiscoveryUpsellingSection } from '.';
import { FIND_POTENTIAL_ATTACKS_WITH_AI } from './translations';

const availabilityMessage = 'Serverless or self-managed-specific availability message';
const upgradeMessage = 'Serverless or self-managed-specific upgrade message';

const mockActions = (
  <div data-test-subj="mockActions">{'typically call to action buttons or links'}</div>
);

describe('AttackDiscoveryUpsellingSection', () => {
  beforeEach(() => {
    render(
      <AttackDiscoveryUpsellingSection
        actions={mockActions}
        availabilityMessage={availabilityMessage}
        upgradeMessage={upgradeMessage}
      />
    );
  });

  it('renders the assistant avatar', () => {
    const assistantAvatar = screen.getByTestId('assistantAvatar');

    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders the expected upgrade title', () => {
    const upgradeTitle = screen.getByTestId('upgradeTitle');

    expect(upgradeTitle).toHaveTextContent(FIND_POTENTIAL_ATTACKS_WITH_AI);
  });

  it('renders the expected availability message', () => {
    const attackDiscoveryIsAvailable = screen.getByTestId('availabilityMessage');

    expect(attackDiscoveryIsAvailable).toHaveTextContent(availabilityMessage);
  });

  it('renders the expected upgrade message', () => {
    const pleaseUpgrade = screen.getByTestId('upgradeMessage');

    expect(pleaseUpgrade).toHaveTextContent(upgradeMessage);
  });

  it('renders the actions', () => {
    const actions = screen.getByTestId('mockActions');

    expect(actions).toBeInTheDocument();
  });
});
