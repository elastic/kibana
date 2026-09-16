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
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { useCanUsePublicLocationsPermission } from '../../../../../../hooks/use_capabilities';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { BulkLabelsFlyout } from './bulk_labels_flyout';

jest.mock('../../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: jest.fn(),
}));

jest.mock('../../../../../../hooks/use_capabilities', () => ({
  ...jest.requireActual('../../../../../../hooks/use_capabilities'),
  useCanUsePublicLocationsPermission: jest.fn(),
}));

jest.mock('../../../../state', () => ({
  ...jest.requireActual('../../../../state'),
  fetchBulkUpdateMonitors: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

const useKibanaSpaceMock = useKibanaSpace as jest.MockedFunction<typeof useKibanaSpace>;
const useCanUsePublicLocationsPermissionMock =
  useCanUsePublicLocationsPermission as jest.MockedFunction<
    typeof useCanUsePublicLocationsPermission
  >;
const fetchBulkUpdateMonitorsMock = fetchBulkUpdateMonitors as jest.MockedFunction<
  typeof fetchBulkUpdateMonitors
>;
const useFetcherMock = useFetcher as jest.Mock;

const makeMonitor = (
  id: string,
  name: string,
  {
    origin = SourceType.UI,
    labels = {} as Record<string, string>,
  }: { origin?: SourceType; labels?: Record<string, string> } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.LABELS]: labels,
  } as unknown as EncryptedSyntheticsSavedMonitor);

const typeAndEnter = (input: Element | null, value: string) => {
  fireEvent.change(input as Element, { target: { value } });
  fireEvent.keyDown(input as Element, { key: 'Enter', code: 'Enter' });
};

describe('<BulkLabelsFlyout />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaSpaceMock.mockReturnValue({ space: { id: 'default' } } as ReturnType<
      typeof useKibanaSpace
    >);
    useCanUsePublicLocationsPermissionMock.mockReturnValue(true);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
    useFetcherMock.mockReturnValue({
      data: { serviceNames: [], labelKeys: ['env', 'team'] },
      loading: false,
    });
  });

  it('adds a label key/value pair, skipping monitors that already match', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { labels: {} }),
      makeMonitor('ui-2', 'UI monitor 2', { labels: { env: 'prod' } }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkLabelsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    const keyInput = getByTestId('syntheticsBulkLabelsKeyComboBox-0').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    typeAndEnter(keyInput, 'env');
    fireEvent.change(getByTestId('syntheticsBulkLabelsValueField-0'), {
      target: { value: 'prod' },
    });

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: undefined,
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.LABELS]: { env: 'prod' } } }],
      });
    });
  });

  it('removes a label key only from monitors that have it', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { labels: {} }),
      makeMonitor('ui-2', 'UI monitor 2', { labels: { env: 'prod', team: 'a' } }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-2', updated: true }],
    });

    const { getByTestId } = render(
      <BulkLabelsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    fireEvent.click(getByTestId('syntheticsBulkEditModeRemove'));

    const removeInput = getByTestId('syntheticsBulkLabelsRemoveComboBox').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    typeAndEnter(removeInput, 'env');

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: undefined,
        updates: [{ id: 'ui-2', attributes: { [ConfigKey.LABELS]: { team: 'a' } } }],
      });
    });
  });

  it('disables submit until a valid pair is entered', () => {
    const { getByTestId } = render(
      <BulkLabelsFlyout
        monitors={[makeMonitor('ui-1', 'UI monitor 1')]}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    expect(getByTestId('syntheticsBulkEditFlyoutSubmit')).toBeDisabled();
  });
});
