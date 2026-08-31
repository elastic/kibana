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
import { kibanaService } from '../../../../../../utils/kibana_service';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { BulkTagsFlyout } from './bulk_tags_flyout';

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
    tags = [] as string[],
    spaces,
  }: { origin?: SourceType; tags?: string[]; spaces?: string[] } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.TAGS]: tags,
    ...(spaces ? { [ConfigKey.KIBANA_SPACES]: spaces } : {}),
  } as unknown as EncryptedSyntheticsSavedMonitor);

const typeAndEnter = (input: Element | null, value: string) => {
  fireEvent.change(input as Element, { target: { value } });
  fireEvent.keyDown(input as Element, { key: 'Enter', code: 'Enter' });
};

describe('<BulkTagsFlyout />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaSpaceMock.mockReturnValue({ space: { id: 'default' } } as ReturnType<
      typeof useKibanaSpace
    >);
    useCanUsePublicLocationsPermissionMock.mockReturnValue(true);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
    useFetcherMock.mockReturnValue({ data: ['prod', 'staging'], loading: false });
  });

  it('adds a tag to eligible monitors and skips non-UI monitors', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { tags: ['prod'] }),
      makeMonitor('ui-2', 'UI monitor 2', { tags: [] }),
      makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [
        { id: 'ui-1', updated: true },
        { id: 'ui-2', updated: true },
      ],
    });

    const { getByTestId, getByText } = render(
      <BulkTagsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    expect(getByText('Changes will apply to 2 selected monitors.')).toBeInTheDocument();
    expect(getByText('1 monitor will not be updated')).toBeInTheDocument();

    const input = getByTestId('syntheticsBulkTagsComboBox').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    typeAndEnter(input, 'team-a');

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: undefined,
        updates: [
          { id: 'ui-1', attributes: { [ConfigKey.TAGS]: ['prod', 'team-a'] } },
          { id: 'ui-2', attributes: { [ConfigKey.TAGS]: ['team-a'] } },
        ],
      });
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes a tag only from monitors that have it', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { tags: ['prod', 'team-a'] }),
      makeMonitor('ui-2', 'UI monitor 2', { tags: ['team-a'] }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkTagsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    fireEvent.click(getByTestId('syntheticsBulkEditModeRemove'));

    const input = getByTestId('syntheticsBulkTagsComboBox').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    typeAndEnter(input, 'prod');

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      // ui-2 has no `prod` tag so it is skipped (unchanged).
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: undefined,
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.TAGS]: ['team-a'] } }],
      });
    });
  });

  it('shows a partial-failure toast when one cross-space request fails', async () => {
    const monitors = [
      makeMonitor('home', 'Home monitor', { spaces: ['default'] }),
      makeMonitor('away', 'Away monitor', { spaces: ['team-b'] }),
    ];
    fetchBulkUpdateMonitorsMock.mockImplementation(({ spaceId, updates }) => {
      if (spaceId === 'team-b') {
        return Promise.reject(new Error('space request failed'));
      }
      return Promise.resolve({
        result: updates.map(({ id }) => ({ id, updated: true })),
      });
    });

    const { getByTestId } = render(
      <BulkTagsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    const input = getByTestId('syntheticsBulkTagsComboBox').querySelector(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    typeAndEnter(input, 'team-a');

    fireEvent.click(getByTestId('syntheticsBulkEditFlyoutSubmit'));

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(kibanaService.toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 updated, 1 failed. Check that the failed monitors are editable and try again.',
        })
      );
    });
    expect(kibanaService.toasts.addSuccess).not.toHaveBeenCalled();
    expect(kibanaService.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('disables the submit button until a tag is selected', () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1')];

    const { getByTestId } = render(
      <BulkTagsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    expect(getByTestId('syntheticsBulkEditFlyoutSubmit')).toBeDisabled();
  });
});
