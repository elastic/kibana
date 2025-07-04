/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/test_helper';
import { alert } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';
import StaleAlert from './stale_alert';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { TopAlert } from '../../../typings/alerts';

jest.mock('../../../utils/kibana_react');
jest.mock('../hooks/use_bulk_untrack_alerts');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

const useBulkUntrackAlertsMock = useBulkUntrackAlerts as jest.Mock;

useBulkUntrackAlertsMock.mockReturnValue({
  mutateAsync: jest.fn(),
});

const ruleMock = {
  ruleTypeId: 'apm',
} as unknown as Rule;
describe('Stale alert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert stale callout', async () => {
    const staleAlert = render(
      <StaleAlert
        alert={alert}
        alertStatus="active"
        rule={ruleMock}
        refetchRule={() => {}}
        onUntrackAlert={() => {}}
      />
    );

    expect(staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCallout')).toBeInTheDocument();
    expect(
      staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCalloutEditRule')
    ).toBeInTheDocument();
    expect(
      staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCalloutMarkAsUntrackedButton')
    ).toBeInTheDocument();
  });

  it('should NOT show alert stale callout < 5 days', async () => {
    const alertUpdated = {
      ...alert,
      start: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    } as unknown as TopAlert;
    const staleAlert = render(
      <StaleAlert
        alert={alertUpdated}
        alertStatus="active"
        rule={ruleMock}
        refetchRule={() => {}}
        onUntrackAlert={() => {}}
      />
    );

    expect(staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCallout')).toBeFalsy();
    expect(staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCalloutEditRule')).toBeFalsy();
    expect(
      staleAlert.queryByTestId('o11yAlertDetailsAlertStaleCalloutMarkAsUntrackedButton')
    ).toBeFalsy();
  });
});
