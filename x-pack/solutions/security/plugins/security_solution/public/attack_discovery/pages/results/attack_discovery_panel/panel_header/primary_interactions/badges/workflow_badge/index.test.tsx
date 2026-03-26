/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { WorkflowBadge } from '.';
import { getMockAttackDiscoveryAlerts } from '../../../../../../mock/mock_attack_discovery_alerts';
import { isAttackDiscoveryAlert } from '../../../../../../utils/is_attack_discovery_alert';

jest.mock('../../../../../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: jest.fn(),
}));

describe('WorkflowBadge', () => {
  const defaultProps = {
    attackDiscovery: getMockAttackDiscoveryAlerts()[0],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the badge when attackDiscovery is an alert with a workflow status', () => {
    (isAttackDiscoveryAlert as unknown as jest.Mock).mockReturnValue(true);

    const { getByText } = render(<WorkflowBadge {...defaultProps} />);

    expect(getByText(defaultProps.attackDiscovery.alertWorkflowStatus ?? '')).toBeInTheDocument();
  });

  it('does NOT render the badge when attackDiscovery is NOT an alert', () => {
    (isAttackDiscoveryAlert as unknown as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(<WorkflowBadge {...defaultProps} />);

    expect(queryByTestId('workflowBadge')).toBeNull();
  });

  it('does NOT render the badge when alertWorkflowStatus is null', () => {
    (isAttackDiscoveryAlert as unknown as jest.Mock).mockReturnValue(true);
    const props = {
      ...defaultProps,
      attackDiscovery: { ...defaultProps.attackDiscovery, alertWorkflowStatus: null },
    };

    const { queryByTestId } = render(<WorkflowBadge {...props} />);

    expect(queryByTestId('workflowBadge')).toBeNull();
  });
});
