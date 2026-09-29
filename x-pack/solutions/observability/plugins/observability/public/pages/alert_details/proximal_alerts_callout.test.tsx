/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import React from 'react';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { useFindProximalAlerts } from './hooks/use_find_proximal_alerts';
import type { ConfigSchema } from '../../plugin';
import type { Subset } from '../../typings';
import { render } from '../../utils/test_helper';
import { alertDetail } from './mock/alert';
import { ProximalAlertsCallout } from './proximal_alerts_callout';
import { fireEvent } from '@testing-library/dom';

vi.mock('../../utils/kibana_react');

vi.mock('../../hooks/use_fetch_alert_detail');

vi.mock('./hooks/use_find_proximal_alerts');
vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('@kbn/ebt-tools');

const useFetchAlertDetailMock = useFetchAlertDetail as Mock;
const useFindProximalAlertsMock = useFindProximalAlerts as Mock;

const config: Subset<ConfigSchema> = {
  unsafe: {
    alertDetails: {
      uptime: { enabled: true },
    },
  },
};

describe('Proximal callout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const switchTabs = vi.fn();

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
