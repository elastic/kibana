/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../../../utils/testing/rtl_helpers';
import { MetricItemIcon } from './metric_item_icon';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

jest.mock('./use_latest_error', () => ({
  useLatestError: () => ({
    loading: false,
    latestPing: { error: { message: 'Something went wrong' } },
  }),
}));

jest.mock('../../../hooks/use_monitor_mws', () => ({
  useMonitorMWs: () => ({ activeMWs: [] }),
}));

jest.mock('../../../../common/links/error_details_link', () => ({
  useErrorDetailsLink: () => '/app/synthetics/error-details',
}));

jest.mock('../../../../../../../hooks/use_date_format', () => ({
  useDateFormat: () => (timestamp?: string) => timestamp ?? '',
}));

describe('MetricItemIcon', () => {
  const configIdByLocation = 'test-config-us_central';

  const monitor = {
    configId: 'test-config',
    locations: [{ id: 'us_central', label: 'US Central' }],
    monitorQueryId: 'test-config',
  } as unknown as OverviewStatusMetaData;

  const renderIcon = () =>
    render(
      <MetricItemIcon
        monitor={monitor}
        status="down"
        configIdByLocation={configIdByLocation}
        timestamp="2026-01-01T00:00:00.000Z"
      />,
      { useRealStore: true }
    );

  it('returns focus to the trigger icon after the error popover is closed', async () => {
    const { getByRole, getByLabelText } = renderIcon();

    const triggerButton = getByRole('button', { name: 'Error details' });
    fireEvent.click(triggerButton);

    const closeButton = getByLabelText('Close popover');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerButton);
    });
  });
});
