/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { RowActionProps } from '.';
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
import { useUserPrivileges } from '../../user_privileges';
import { initialUserPrivilegesState } from '../../user_privileges/user_privileges_context';
import { useIsNewFlyoutEnabled } from '../../../hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';

jest.mock('../../../hooks/use_is_new_flyout_enabled');
jest.mock('../../../../flyout_v2/use_flyout_api');
const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => {
  const original = jest.requireActual('react-redux-v7');

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

jest.mock('../../user_privileges');

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
describe('RowAction', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  const sampleData = {
    _id: '1',
    data: [],
    ecs: {
      _id: '1',
    },
  };
  const defaultProps: RowActionProps = {
    esHitRecord: {
      _id: '1',
      _index: 'test-index',
      _source: {},
    },
    columnHeaders: defaultHeaders,
    controlColumn: getDefaultControlColumn(5)[0],
    data: sampleData,
    disabled: false,
    index: 1,
    isEventViewer: false,
    loadingEventIds: [],
    onRowSelected: jest.fn(),
    onRuleChange: jest.fn(),
    refetch: jest.fn(),
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
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    (useRouteSpy as jest.Mock).mockReturnValue([mockRouteSpy]);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
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

  test('should open the legacy expandable flyout when enableNewFlyout setting is disabled', () => {
    const wrapper = render(
      <TestProviders>
        <RowAction {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(wrapper.getByTestId('expand-event'));

    expect(mockOpenFlyout).toHaveBeenCalled();
    expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  test('should open the new document flyout when enableNewFlyout setting is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);
    const refetch = jest.fn();

    const wrapper = render(
      <TestProviders>
        <RowAction {...defaultProps} refetch={refetch} />
      </TestProviders>
    );

    fireEvent.click(wrapper.getByTestId('expand-event'));

    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: '1',
        indexName: undefined,
        renderCellActions: expect.any(Function),
        onAlertUpdated: expect.any(Function),
      })
    );

    const { onAlertUpdated } = flyoutApi.openDocumentFlyoutFromIndex.mock.calls[0][0];
    onAlertUpdated?.();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  describe('notes', () => {
    beforeEach(() => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        notesPrivileges: { read: true, crud: true },
        timelinePrivileges: { read: true },
      });
    });

    test('should open the legacy expandable flyout when enableNewFlyout setting is disabled', () => {
      const wrapper = render(
        <TestProviders>
          <RowAction {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(wrapper.getByTestId('timeline-notes-button-small'));

      expect(mockOpenFlyout).toHaveBeenCalled();
      expect(flyoutApi.openNotes).not.toHaveBeenCalled();
    });

    test('should open the new notes flyout when enableNewFlyout setting is enabled', () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      const wrapper = render(
        <TestProviders>
          <RowAction {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(wrapper.getByTestId('timeline-notes-button-small'));

      expect(mockOpenFlyout).not.toHaveBeenCalled();
      expect(flyoutApi.openNotes).toHaveBeenCalledWith(
        expect.objectContaining({ hit: expect.any(Object) })
      );
    });
  });

  describe('privileges', () => {
    test('should show notes and timeline buttons when the user has the required privileges', () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        notesPrivileges: { read: true },
        timelinePrivileges: { read: true },
      });

      const wrapper = render(
        <TestProviders>
          <RowAction {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.queryByTestId('timeline-notes-button-small')).toBeInTheDocument();
      expect(wrapper.queryByTestId('send-alert-to-timeline-button')).toBeInTheDocument();
    });

    test('should not show notes and timeline buttons when the user does not have the required privileges', () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        notesPrivileges: { read: false },
        timelinePrivileges: { read: false },
      });

      const wrapper = render(
        <TestProviders>
          <RowAction {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.queryByTestId('timeline-notes-button-small')).not.toBeInTheDocument();
      expect(wrapper.queryByTestId('send-alert-to-timeline-button')).not.toBeInTheDocument();
    });
  });
});
