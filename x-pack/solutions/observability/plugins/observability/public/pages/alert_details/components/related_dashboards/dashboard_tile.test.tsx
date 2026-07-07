/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import type { LinkedDashboard } from '@kbn/observability-schema';
import { render } from '../../../../utils/test_helper';
import { useKibana } from '../../../../utils/kibana_react';
import { createTelemetryClientMock } from '../../../../services/telemetry/telemetry_client.mock';
import { DashboardTile } from './dashboard_tile';

jest.mock('../../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const telemetryClientMock = createTelemetryClientMock();

const dashboard: LinkedDashboard = {
  id: 'dashboard-1',
  title: 'My dashboard',
  matchedBy: {},
};

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      telemetryClient: telemetryClientMock,
      share: {
        url: {
          locators: {
            get: () => ({
              getRedirectUrl: () => 'http://localhost/app/dashboards#/view/dashboard-1',
            }),
          },
        },
      },
      savedObjectsTagging: {
        ui: {
          convertNameToReference: jest.fn(),
          components: {
            TagList: () => <div />,
          },
        },
      },
    },
  });
};

describe('DashboardTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('reports linked dashboard view with rule id and dashboard id', () => {
    const { getByTestId } = render(
      <DashboardTile
        dashboard={dashboard}
        timeRange={{ from: 'now-15m', to: 'now' }}
        ruleId="rule-1"
      />
    );

    fireEvent.click(getByTestId('alertDetails_viewLinkedDashboard_undefined'));

    expect(telemetryClientMock.reportLinkedDashboardViewed).toHaveBeenCalledWith(
      'unknown',
      'rule-1',
      'dashboard-1'
    );
  });

  it('reports suggested dashboard added with rule id and dashboard id', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(
      <DashboardTile
        dashboard={dashboard}
        timeRange={{ from: 'now-15m', to: 'now' }}
        ruleId="rule-1"
        actionButtonProps={{
          onClick,
          label: 'Add to linked dashboards',
          isLoading: false,
          isDisabled: false,
          ruleType: 'logs.alert.document.count',
        }}
      />
    );

    fireEvent.click(
      getByTestId('addSuggestedDashboard_alertDetailsPage_logs.alert.document.count')
    );

    expect(onClick).toHaveBeenCalledWith(dashboard);
    expect(telemetryClientMock.reportSuggestedDashboardAdded).toHaveBeenCalledWith(
      'logs.alert.document.count',
      'rule-1',
      'dashboard-1'
    );
  });
});
