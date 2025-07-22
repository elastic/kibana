/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import React from 'react';
import { AlertData, useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { useFindProximalAlerts } from './hooks/use_find_proximal_alerts';
import { ConfigSchema } from '../../plugin';
import { Subset } from '../../typings';
import { render } from '../../utils/test_helper';
import { alertDetail } from './mock/alert';
import { ProximalAlertsCallout } from './proximal_alerts_callout';
import { fireEvent } from '@testing-library/dom';

jest.mock('../../utils/kibana_react');

jest.mock('../../hooks/use_fetch_alert_detail');

jest.mock('./hooks/use_find_proximal_alerts');
jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('@kbn/ebt-tools');

const useFetchAlertDetailMock = useFetchAlertDetail as jest.Mock;
const useFindProximalAlertsMock = useFindProximalAlerts as jest.Mock;

const config: Subset<ConfigSchema> = {
  unsafe: {
    alertDetails: {
      uptime: { enabled: true },
    },
  },
};

describe('Proximal callout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const switchTabs = jest.fn();

  const renderCallout = (alert: AlertData) =>
    render(
      <IntlProvider locale="en">
        <ProximalAlertsCallout alertDetail={alert} switchTabs={switchTabs} />
      </IntlProvider>,
      config
    );

  it('should recommend the user see more related alerts', async () => {
    useFindProximalAlertsMock.mockReturnValue({
      data: { total: 5 },
      isError: false,
      isLoading: false,
    });

    useFetchAlertDetailMock.mockReturnValue([false, alertDetail]);
    const callout = renderCallout(alertDetail);
    expect(callout.queryByTestId('see-proximal-alerts')).toBeTruthy();
    fireEvent.click(callout.getByText('See related alerts'));
    expect(switchTabs).toHaveBeenCalled();
  });

  it('should not recommend the user see more related alerts', async () => {
    useFindProximalAlertsMock.mockReturnValue({
      data: { total: 0 },
      isError: false,
      isLoading: false,
    });

    useFetchAlertDetailMock.mockReturnValue([false, alertDetail]);
    const callout = renderCallout(alertDetail);
    expect(callout.queryByTestId('see-proximal-alerts')).toBeFalsy();
  });
});
