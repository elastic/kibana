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
import UntrackedAlert from './untracked_alert';
import type { TopAlert } from '../../../typings/alerts';

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

describe('Untracked alert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert untracked callout', async () => {
    const untrackedAlert = render(
      <UntrackedAlert alert={alert} alertStatus="untracked" onUntrackAlert={() => {}} />
    );

    expect(
      untrackedAlert.queryByTestId('o11yAlertDetailsUntrackedAlertCallout')
    ).toBeInTheDocument();
    expect(
      untrackedAlert.queryByTestId('o11yAlertDetailsUntrackedAlertCalloutMarkAsUntrackedButton')
    ).toBeInTheDocument();
  });

  it('should NOT show alert untracked callout', async () => {
    const alertUpdated = {
      ...alert,
      status: 'active',
    } as unknown as TopAlert;
    const untrackedAlert = render(
      <UntrackedAlert alert={alertUpdated} alertStatus="active" onUntrackAlert={() => {}} />
    );

    expect(untrackedAlert.queryByTestId('o11yAlertDetailsUntrackedAlertCallout')).toBeFalsy();
  });
});
