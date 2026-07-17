/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { render } from '../../../../utils/testing/rtl_helpers';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { BulkServiceNameFlyout } from './bulk_service_name_flyout';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useGetUrlParams: jest.fn(),
}));

jest.mock('../../../../state', () => ({
  ...jest.requireActual('../../../../state'),
  fetchBulkUpdateMonitors: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

const useGetUrlParamsMock = useGetUrlParams as jest.MockedFunction<typeof useGetUrlParams>;
const fetchBulkUpdateMonitorsMock = fetchBulkUpdateMonitors as jest.MockedFunction<
  typeof fetchBulkUpdateMonitors
>;
const useFetcherMock = useFetcher as jest.Mock;

const makeMonitor = (
  id: string,
  name: string,
  { origin = SourceType.UI, serviceName = '' }: { origin?: SourceType; serviceName?: string } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.APM_SERVICE_NAME]: serviceName,
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('<BulkServiceNameFlyout />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetUrlParamsMock.mockReturnValue({ spaceId: 'default' } as ReturnType<
      typeof useGetUrlParams
    >);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
    useFetcherMock.mockReturnValue({
      data: { serviceNames: ['cart', 'checkout'], labelKeys: [] },
      loading: false,
    });
  });

  it('is disabled until the user sets a value', () => {
    const { getByTestId } = render(
      <BulkServiceNameFlyout
        monitors={[makeMonitor('ui-1', 'UI monitor 1')]}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    expect(getByTestId('syntheticsBulkEditFlyoutSubmit')).toBeDisabled();
  });

  it('overwrites the service name on monitors that differ', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { serviceName: 'old' }),
      makeMonitor('ui-2', 'UI monitor 2', { serviceName: 'cart' }),
      makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkServiceNameFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    const input = getByTestId('syntheticsBulkServiceNameComboBox').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    fireEvent.change(input as Element, { target: { value: 'cart' } });
    fireEvent.keyDown(input as Element, { key: 'Enter', code: 'Enter' });

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      // ui-2 already uses 'cart' so it is skipped as unchanged.
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.APM_SERVICE_NAME]: 'cart' } }],
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
