/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mocks must be at the top, before imports that use them
jest.mock('../../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../../detections/components/alerts_table', () => ({
  AlertsTable: () => <div data-test-subj="detection-engine-alerts-table" />,
}));
jest.mock('./ease/wrapper', () => ({
  EaseAlertsTab: () => <div data-test-subj="ease-alerts-table" />,
}));

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscovery } from '../../../../mock/mock_attack_discovery';
import { AlertsTab } from '.';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../../../common';

describe('AlertsTab', () => {
  const defaultProps = { attackDiscovery: mockAttackDiscovery };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the alerts tab with DetectionEngineAlertsTable', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });

    render(
      <TestProviders>
        <AlertsTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });

  it('renders the alerts tab with EASE alerts table', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: true,
            },
          },
        },
      },
    });

    render(
      <TestProviders>
        <AlertsTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });

  it('renders DetectionEngineAlertsTable when EASE is false', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });

    render(
      <TestProviders>
        <AlertsTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('detection-engine-alerts-table').length).toBe(2);
  });

  it('renders EaseAlertsTab when EASE is true', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: true,
            },
          },
        },
      },
    });

    render(
      <TestProviders>
        <AlertsTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('ease-alerts-table').length).toBe(2);
  });

  it('renders with replacements mapping alertIds', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });
    const replacements = {
      [mockAttackDiscovery.alertIds[0]]: 'replacement-id-1',
      [mockAttackDiscovery.alertIds[1]]: 'replacement-id-2',
    };
    render(
      <TestProviders>
        <AlertsTab {...defaultProps} replacements={replacements} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });

  it('renders with replacements missing mapping for some alertIds', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });
    const replacements = {
      [mockAttackDiscovery.alertIds[0]]: 'replacement-id-1',
    };
    render(
      <TestProviders>
        <AlertsTab {...defaultProps} replacements={replacements} />
      </TestProviders>
    );
    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });

  it('renders with empty alertIds', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
          },
        },
      },
    });
    const emptyAttackDiscovery = { ...mockAttackDiscovery, alertIds: [] };
    render(
      <TestProviders>
        <AlertsTab attackDiscovery={emptyAttackDiscovery} />
      </TestProviders>
    );
    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });
});
