/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badges } from '.';
import { TestProviders } from '../../../../../../../common/mock/test_providers';
import { getMockAttackDiscoveryAlerts } from '../../../../../mock/mock_attack_discovery_alerts';

// Mock child badge components to isolate Badges
jest.mock('./workflow_badge', () => ({
  WorkflowBadge: () => <div data-test-subj="workflowBadge" />,
}));
jest.mock('./shared_badge', () => ({
  SharedBadge: () => <div data-test-subj="sharedBadge" />,
}));

const mockAttackDiscoveryAlert = getMockAttackDiscoveryAlerts()[0];
const defaultProps = { attackDiscovery: mockAttackDiscoveryAlert };

describe('Badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders badges for an AttackDiscoveryAlert', () => {
    render(
      <TestProviders>
        <Badges {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('badges')).toBeInTheDocument();
  });

  it('renders the WorkflowBadge', () => {
    render(
      <TestProviders>
        <Badges {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('workflowBadge')).toBeInTheDocument();
  });

  it('renders the SharedBadge', () => {
    render(
      <TestProviders>
        <Badges {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('sharedBadge')).toBeInTheDocument();
  });
});
