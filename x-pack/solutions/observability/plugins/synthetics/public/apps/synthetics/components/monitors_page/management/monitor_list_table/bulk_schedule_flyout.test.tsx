/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import {
  ConfigKey,
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../../../../../common/runtime_types';
import { render } from '../../../../utils/testing/rtl_helpers';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { BulkScheduleFlyout } from './bulk_schedule_flyout';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useGetUrlParams: jest.fn(),
}));

jest.mock('../../../../state', () => ({
  ...jest.requireActual('../../../../state'),
  fetchBulkUpdateMonitors: jest.fn(),
}));

const useGetUrlParamsMock = useGetUrlParams as jest.MockedFunction<typeof useGetUrlParams>;
const fetchBulkUpdateMonitorsMock = fetchBulkUpdateMonitors as jest.MockedFunction<
  typeof fetchBulkUpdateMonitors
>;

const makeMonitor = (
  id: string,
  name: string,
  {
    origin = SourceType.UI,
    type = MonitorTypeEnum.HTTP,
    schedule = { number: '3', unit: ScheduleUnit.MINUTES },
  }: {
    origin?: SourceType;
    type?: MonitorTypeEnum;
    schedule?: { number: string; unit: ScheduleUnit };
  } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.MONITOR_TYPE]: type,
    [ConfigKey.SCHEDULE]: schedule,
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('<BulkScheduleFlyout />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetUrlParamsMock.mockReturnValue({ spaceId: 'default' } as ReturnType<
      typeof useGetUrlParams
    >);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
  });

  const selectValue = (getByTestId: (id: string) => HTMLElement, value: string) => {
    fireEvent.change(getByTestId('syntheticsBulkScheduleSelect'), { target: { value } });
  };

  const clickSave = (getByTestId: (id: string) => HTMLElement) => {
    fireEvent.click(getByTestId('syntheticsBulkScheduleSave'));
  };

  it('offers sub-minute options when all selected monitors are lightweight', () => {
    const monitors = [
      makeMonitor('ui-1', 'HTTP monitor', { type: MonitorTypeEnum.HTTP }),
      makeMonitor('ui-2', 'TCP monitor', { type: MonitorTypeEnum.TCP }),
    ];

    const { getByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    const select = getByTestId('syntheticsBulkScheduleSelect') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('10s');
    expect(values).toContain('30s');
  });

  it('hides sub-minute options when the selection includes a browser monitor', () => {
    const monitors = [
      makeMonitor('ui-1', 'HTTP monitor', { type: MonitorTypeEnum.HTTP }),
      makeMonitor('ui-2', 'Browser monitor', { type: MonitorTypeEnum.BROWSER }),
    ];

    const { getByTestId, getByText } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    const select = getByTestId('syntheticsBulkScheduleSelect') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).not.toContain('10s');
    expect(values).not.toContain('30s');
    expect(values).toContain('1');
    expect(
      getByText(
        'Sub-minute frequencies are hidden because the selection includes browser monitors, which run at most once per minute.'
      )
    ).toBeInTheDocument();
  });

  it('patches only monitors whose schedule actually changes', async () => {
    const monitors = [
      makeMonitor('ui-1', 'Already 5m', { schedule: { number: '5', unit: ScheduleUnit.MINUTES } }),
      makeMonitor('ui-2', 'Currently 3m', {
        schedule: { number: '3', unit: ScheduleUnit.MINUTES },
      }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [{ id: 'ui-2', updated: true }] });

    const { getByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectValue(getByTestId, '5');
    clickSave(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [
          {
            id: 'ui-2',
            attributes: { [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES } },
          },
        ],
      });
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('converts a seconds selection to the { number, unit } payload', async () => {
    const monitors = [makeMonitor('ui-1', 'HTTP monitor', { type: MonitorTypeEnum.HTTP })];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [{ id: 'ui-1', updated: true }] });

    const { getByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectValue(getByTestId, '30s');
    clickSave(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [
          {
            id: 'ui-1',
            attributes: { [ConfigKey.SCHEDULE]: { number: '30', unit: ScheduleUnit.SECONDS } },
          },
        ],
      });
    });
  });

  it('splits eligible vs. skipped monitors', () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor'),
      makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT }),
    ];

    const { getByText } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    expect(getByText('Set a new run schedule for 1 selected monitor.')).toBeInTheDocument();
    expect(getByText('1 monitor will not be updated')).toBeInTheDocument();
  });

  it('shows a partial-failure warning toast when some updates fail', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1'), makeMonitor('ui-2', 'UI monitor 2')];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [
        { id: 'ui-1', updated: true },
        { id: 'ui-2', updated: false, error: 'boom' },
      ],
    });

    const { getByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectValue(getByTestId, '10');
    clickSave(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 updated, 1 failed. Check that the failed monitors are editable and try again.',
        })
      );
    });
  });

  it('calls onClose when cancelled without hitting the API', () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor')];

    const { getByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    fireEvent.click(getByTestId('syntheticsBulkScheduleCancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchBulkUpdateMonitorsMock).not.toHaveBeenCalled();
  });

  it('summarises how many monitors will change vs. stay unchanged', () => {
    const monitors = [
      makeMonitor('ui-1', 'Already 5m', { schedule: { number: '5', unit: ScheduleUnit.MINUTES } }),
      makeMonitor('ui-2', 'Currently 3m', {
        schedule: { number: '3', unit: ScheduleUnit.MINUTES },
      }),
    ];

    const { getByTestId, queryByTestId } = render(
      <BulkScheduleFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    // Nothing selected yet: no summary.
    expect(queryByTestId('syntheticsBulkScheduleEffectSummary')).not.toBeInTheDocument();

    // Set 5m: ui-2 changes, ui-1 already on 5m (unchanged).
    selectValue(getByTestId, '5');
    expect(getByTestId('syntheticsBulkScheduleEffectSummary')).toHaveTextContent(
      '1 will change · 1 unchanged'
    );
  });
});
