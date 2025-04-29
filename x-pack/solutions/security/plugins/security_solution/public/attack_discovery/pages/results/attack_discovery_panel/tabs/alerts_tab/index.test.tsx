/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscovery } from '../../../../mock/mock_attack_discovery';
import { AlertsTab } from '.';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../../../common';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../detections/components/alerts_table', () => ({
  DetectionEngineAlertsTable: () => <div />,
}));
jest.mock('./ai_for_soc/wrapper', () => ({
  AiForSOCAlertsTab: () => <div />,
}));

describe('AlertsTab', () => {
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

    const { getByTestId } = render(
      <TestProviders>
        <AlertsTab attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    expect(getByTestId('alertsTab')).toBeInTheDocument();
    expect(getByTestId('detection-engine-alerts-table')).toBeInTheDocument();
  });

  it('renders the alerts tab with AI4DSOC alerts table', () => {
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

    const { getByTestId } = render(
      <TestProviders>
        <AlertsTab attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    expect(getByTestId('alertsTab')).toBeInTheDocument();
    expect(getByTestId('ai4dsoc-alerts-table')).toBeInTheDocument();
  });
});
