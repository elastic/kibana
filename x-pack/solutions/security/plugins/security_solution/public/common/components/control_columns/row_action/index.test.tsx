/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { RowAction } from '.';
import { defaultHeaders, TestProviders } from '../../../mock';
import { getDefaultControlColumn } from '../../../../timelines/components/timeline/body/control_columns';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import type { RouteSpyState } from '../../../utils/route/types';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { createTelemetryServiceMock } from '../../../lib/telemetry/telemetry_service.mock';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';
import type { ExpandableFlyoutState } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi, useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { createExpandableFlyoutApiMock } from '../../../mock/expandable_flyout';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../utils/route/use_route_spy');

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout');

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
  };
});
jest.mock('../../guided_onboarding_tour/tour_step');

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
describe('RowAction', () => {
  const sampleData = {
    _id: '1',
    data: [],
    ecs: {
      _id: '1',
    },
  };
  const defaultProps = {
    columnHeaders: defaultHeaders,
    controlColumn: getDefaultControlColumn(5)[0],
    data: sampleData,
    disabled: false,
    index: 1,
    isEventViewer: false,
    loadingEventIds: [],
    onRowSelected: jest.fn(),
    onRuleChange: jest.fn(),
    selectedEventIds: {},
    tableId: TableId.test,
    width: 100,
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
    pageRowIndex: 0,
    columnId: 'test-columnId',
    isDetails: false,
    isExpanded: false,
    isExpandable: false,
    rowIndex: 0,
    colIndex: 0,
    setCellProps: jest.fn(),
    tabType: 'query',
    showCheckboxes: false,
  };

  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    (useRouteSpy as jest.Mock).mockReturnValue([mockRouteSpy]);
    jest.clearAllMocks();
  });

  test('displays expand events button', () => {
    const wrapper = render(
      <TestProviders>
        <RowAction {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.getAllByTestId('expand-event')).not.toBeNull();
  });

  test('should always show expandable flyout if the page is attackDiscovery', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      { ...mockRouteSpy, pageName: SecurityPageName.attackDiscovery },
    ]);
    const wrapper = render(
      <TestProviders>
        <RowAction {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('expand-event'));
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: '1',
          indexName: undefined,
          scopeId: 'table-test',
        },
      },
    });
  });
});
