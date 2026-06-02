/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AdditionalToolbarControls } from './additional_toolbar_controls';
import { TableId } from '@kbn/securitysolution-data-table';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { PageScope } from '../../../data_view_manager/constants';
import * as useGetGroupSelectorHook from '@kbn/grouping/src/hooks/use_get_group_selector';

const mockDispatch = jest.fn();
const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../common/hooks/use_selector');
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];
const tableId = TableId.test;

const groups = {
  [tableId]: { options: mockOptions, activeGroups: ['kibana.alert.rule.name'] },
};

describe('AdditionalToolbarControls', () => {
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => groups[tableId]);
    (useShallowEqualSelector as jest.Mock).mockReturnValue({
      showOnlyThreatIndicatorAlerts: false,
      showBuildBlockAlerts: false,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  test('Should render the group selector component and allow the user to select a grouping field', async () => {
    const store = createMockStore({
      ...mockGlobalState,
      groups,
    });
    render(
      <TestProviders store={store}>
        <AdditionalToolbarControls tableType={tableId} pageScope={PageScope.alerts} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('group-selector-dropdown'));
    fireEvent.click(screen.getByTestId('panel-user.name'));

    await waitFor(() => {
      expect(mockDispatch.mock.calls[0][0].payload).toEqual({
        activeGroups: ['user.name'],
        tableId,
      });
    });
  });

  test('Should pass settings to useGetGroupSelectorStateless', () => {
    const settings = {
      hideNoneOption: true,
      hideCustomFieldOption: true,
      hideOptionsTitle: true,
      popoverButtonLabel: 'Custom Label',
    };
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
      ...groups[tableId],
      settings,
    }));

    const useGetGroupSelectorStatelessSpy = jest.spyOn(
      useGetGroupSelectorHook,
      'useGetGroupSelectorStateless'
    );

    const store = createMockStore({
      ...mockGlobalState,
      groups: {
        [tableId]: {
          ...groups[tableId],
          settings,
        },
      },
    });

    render(
      <TestProviders store={store}>
        <AdditionalToolbarControls tableType={tableId} pageScope={PageScope.alerts} />
      </TestProviders>
    );

    expect(useGetGroupSelectorStatelessSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        settings,
      })
    );
  });
});
