/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import type { GroupingBucket, ParsedGroupingAggregation } from '@kbn/grouping/src';

import { TestProviders } from '../../../../common/mock';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { TABLE_SECTION_TEST_ID, TableSection } from './table_section';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import { useGetDefaultGroupTitleRenderers } from '../../../hooks/attacks/use_get_default_group_title_renderers';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';
import { groupingOptions, groupingSettings } from './grouping_configs';

jest.mock('../../user_info');
jest.mock('../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../hooks/attacks/use_get_default_group_title_renderers');
jest.mock('../../alerts_table/alerts_grouping', () => ({
  ...jest.requireActual('../../alerts_table/alerts_grouping'),
  GroupedAlertsTable: jest.fn(),
}));

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };
const dataView: DataView = createStubDataView({ spec: dataViewSpec });

const mockUseGetDefaultGroupTitleRenderers = useGetDefaultGroupTitleRenderers as jest.Mock;
const mockGroupedAlertsTable = GroupedAlertsTable as unknown as jest.Mock;

describe('<TableSection />', () => {
  beforeEach(() => {
    mockUseGetDefaultGroupTitleRenderers.mockReturnValue({
      defaultGroupTitleRenderers: jest.fn(),
    });
    mockGroupedAlertsTable.mockImplementation((props) => (
      <div data-test-subj="mock-grouped-alerts-table">{props.additionalToolbarControls}</div>
    ));
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <TableSection statusFilter={[]} pageFilters={[]} dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId('mock-grouped-alerts-table')).toBeInTheDocument();
    });
  });

  it('should pass groupingOptions and groupingSettings to GroupedAlertsTable', async () => {
    render(
      <TestProviders>
        <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(GroupedAlertsTable).toHaveBeenCalled();
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.defaultGroupingOptions).toEqual(groupingOptions);
      expect(props.settings).toEqual(groupingSettings);
    });
  });

  it('should call useGetDefaultGroupTitleRenderers with attackIds from onAggregationsChange when groupingLevel is 0', async () => {
    let onAggregationsChange: (
      aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
      groupingLevel?: number
    ) => void = () => {};
    mockGroupedAlertsTable.mockImplementation((props) => {
      onAggregationsChange = props.onAggregationsChange;
      return <div data-test-subj="mock-grouped-alerts-table" />;
    });

    render(
      <TestProviders>
        <TableSection pageFilters={[]} statusFilter={[]} dataView={dataView} />
      </TestProviders>
    );

    const mockAggs: ParsedGroupingAggregation<AlertsGroupingAggregation> = {
      groupByFields: {
        buckets: [
          {
            key: ['attack-id-1'],
            key_as_string: 'attack-id-1',
            doc_count: 1,
            selectedGroup: ALERT_ATTACK_IDS,
            isNullGroup: false,
          } as GroupingBucket<AlertsGroupingAggregation>,
        ],
      },
    };

    await waitFor(() => {
      onAggregationsChange(mockAggs, 0);
    });

    await waitFor(() => {
      expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
        attackIds: ['attack-id-1'],
        showAnonymized: false,
      });
    });
  });

  it('should not call useGetDefaultGroupTitleRenderers when groupingLevel is not 0', async () => {
    let onAggregationsChange: (
      aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
      groupingLevel?: number
    ) => void = () => {};
    mockGroupedAlertsTable.mockImplementation((props) => {
      onAggregationsChange = props.onAggregationsChange;
      return <div data-test-subj="mock-grouped-alerts-table" />;
    });

    render(
      <TestProviders>
        <TableSection pageFilters={[]} statusFilter={[]} dataView={dataView} />
      </TestProviders>
    );

    const mockAggs: ParsedGroupingAggregation<AlertsGroupingAggregation> = {
      groupByFields: {
        buckets: [
          {
            key: ['attack-id-1'],
            key_as_string: 'attack-id-1',
            doc_count: 1,
            selectedGroup: ALERT_ATTACK_IDS,
            isNullGroup: false,
          } as GroupingBucket<AlertsGroupingAggregation>,
        ],
      },
    };

    await waitFor(() => {
      onAggregationsChange(mockAggs, 1);
    });

    await waitFor(() => {
      expect(mockUseGetDefaultGroupTitleRenderers).not.toHaveBeenCalledWith({
        attackIds: ['attack-id-1'],
      });
    });
  });

  it('should render the table while things user data is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: true,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });

    render(
      <TestProviders>
        <TableSection statusFilter={[]} pageFilters={[]} dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.loading).toBe(true);
    });
  });

  it('should render the table while things list config is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: true,
    });

    render(
      <TestProviders>
        <TableSection statusFilter={[]} pageFilters={[]} dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.loading).toBe(true);
    });
  });

  describe('showAnonymizedSwitch', () => {
    beforeEach(() => {
      (useUserData as jest.Mock).mockReturnValue([
        {
          loading: false,
        },
      ]);
      (useListsConfig as jest.Mock).mockReturnValue({
        loading: false,
      });
    });

    it('should render the show anonymized switch', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized`)).toBeInTheDocument();
      });
    });

    it('should render the switch as unchecked by default', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        const switchElement = getByTestId(
          `${TABLE_SECTION_TEST_ID}-show-anonymized`
        ) as HTMLButtonElement;
        expect(switchElement).toHaveAttribute('aria-checked', 'false');
      });
    });

    it('should toggle the switch state when clicked', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        const switchElement = getByTestId(
          `${TABLE_SECTION_TEST_ID}-show-anonymized`
        ) as HTMLButtonElement;
        expect(switchElement).toHaveAttribute('aria-checked', 'false');
      });

      const switchElement = getByTestId(
        `${TABLE_SECTION_TEST_ID}-show-anonymized`
      ) as HTMLButtonElement;

      await act(async () => {
        switchElement.click();
      });

      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should pass the switch in additionalToolbarControls to GroupedAlertsTable', async () => {
      render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockGroupedAlertsTable).toHaveBeenCalled();
      });

      const lastCall =
        mockGroupedAlertsTable.mock.calls[mockGroupedAlertsTable.mock.calls.length - 1][0];
      expect(lastCall.additionalToolbarControls).toBeDefined();
      expect(Array.isArray(lastCall.additionalToolbarControls)).toBe(true);
      expect(lastCall.additionalToolbarControls).toHaveLength(1);
    });

    it('should pass showAnonymized=false to useGetDefaultGroupTitleRenderers by default', async () => {
      render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
          attackIds: undefined,
          showAnonymized: false,
        });
      });
    });

    it('should pass showAnonymized=true to useGetDefaultGroupTitleRenderers when switch is toggled on', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
          attackIds: undefined,
          showAnonymized: false,
        });
      });

      const switchElement = getByTestId(
        `${TABLE_SECTION_TEST_ID}-show-anonymized`
      ) as HTMLButtonElement;

      await act(async () => {
        switchElement.click();
      });

      await waitFor(() => {
        expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
          attackIds: undefined,
          showAnonymized: true,
        });
      });
    });

    it('should update showAnonymized back to false when switch is toggled off', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      const switchElement = getByTestId(
        `${TABLE_SECTION_TEST_ID}-show-anonymized`
      ) as HTMLButtonElement;

      // Toggle on
      await act(async () => {
        switchElement.click();
      });

      await waitFor(() => {
        expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
          attackIds: undefined,
          showAnonymized: true,
        });
      });

      // Toggle off
      await act(async () => {
        switchElement.click();
      });

      await waitFor(() => {
        expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
          attackIds: undefined,
          showAnonymized: false,
        });
      });
    });
  });

  describe('enforced groups', () => {
    it('should pass all grouping settings including enforcedGroups', async () => {
      render(
        <TestProviders>
          <TableSection dataView={dataView} statusFilter={[]} pageFilters={[]} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(GroupedAlertsTable).toHaveBeenCalled();
        const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
        expect(props.settings).toMatchObject({
          hideNoneOption: true,
          hideCustomFieldOption: true,
          hideOptionsTitle: true,
          enforcedGroups: [ALERT_ATTACK_IDS],
        });
      });
    });
  });
});
