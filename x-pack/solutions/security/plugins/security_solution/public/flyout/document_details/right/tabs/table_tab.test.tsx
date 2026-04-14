/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentDetailsContext } from '../../shared/context';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { TableTab } from './table_tab';
import { TestProviders } from '../../../../common/mock';
import { mockContextValue } from '../../shared/mocks/mock_context';
import {
  FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID,
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
  TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID,
} from '../components/test_ids';
import { notificationServiceMock } from '@kbn/core/public/mocks';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockNotifications = notificationServiceMock.createStartContract();

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      services: {
        storage: {
          get: mockGet,
          set: mockSet,
        },
        notifications: mockNotifications,
      },
    }),
    useUiSetting: () => false,
  };
});

jest.mock('../components/test_ids', () => ({
  FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID: 'mockFlyoutTableFieldNameCellIcon',
  FLYOUT_TABLE_PIN_ACTION_TEST_ID: 'mockFlyoutTablePinAction',
  FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID: 'mockFlyoutTableFieldNameCellText',
  FLYOUT_TABLE_PREVIEW_LINK_FIELD_TEST_ID: 'mockFlyoutTablePreviewLinkField',
  TABLE_TAB_SETTING_BUTTON_TEST_ID: 'mockTableTabSettingButton',
  TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID: 'mockTableHighlightedFieldsOnly',
  TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID: 'mockTableHideEmptyFields',
  TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID: 'mockTableHideAlertFields',
  TABLE_TAB_TOUR_TEST_ID: 'mockTableTabTour',
}));

jest.mock('../../../../common/mock', () => {
  const ReactLib = jest.requireActual('react');
  return {
    TestProviders: ({ children }: { children: React.ReactNode }) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
  };
});

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(() => []),
}));

jest.mock('../../../entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: () => ({
    entity: null,
    entityRecord: null,
    firstSeen: null,
    lastSeen: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../utils/table_tab_columns', () => ({
  getTableTabColumns: () => {
    const ReactLib = jest.requireActual('react');
    return [
      {
        field: 'field',
        name: 'Field',
        render: (field: string) =>
          ReactLib.createElement(
            'span',
            null,
            ReactLib.createElement('span', {
              'data-test-subj': 'mockFlyoutTableFieldNameCellIcon',
            }),
            field
          ),
      },
      {
        field: 'values',
        name: 'Value',
        render: (values: string[] | string) =>
          ReactLib.createElement('span', null, Array.isArray(values) ? values.join(', ') : values),
      },
    ];
  },
}));

// FLAKY: https://github.com/elastic/kibana/issues/216393
describe('<TableTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table component', () => {
    const contextValue = {
      eventId: 'some_Id',
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      investigationFields: [],
      searchHit: {
        _id: 'test-id',
        _index: 'test-index',
        _source: {},
      },
    } as unknown as DocumentDetailsContext;

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(TABLE_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should renders the column headers and a field/value pair', () => {
    const { getAllByTestId, getByText } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByText('Field')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    expect(getByText('kibana.alert.workflow_status')).toBeInTheDocument();
    expect(getByText('open')).toBeInTheDocument();
    expect(getAllByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID).length).toBeGreaterThan(0);
  });

  it('should filter the table correctly', async () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    await userEvent.type(getByTestId(TABLE_TAB_SEARCH_INPUT_TEST_ID), 'test');
    expect(queryByText('kibana.alert.workflow_status')).not.toBeInTheDocument();
    expect(queryByText('open')).not.toBeInTheDocument();
    expect(queryByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should fetch the table state from local storage', async () => {
    mockGet.mockReturnValue({
      pinnedFields: [],
      showHighlightedFields: true,
      hideEmptyFields: false,
      hideAlertFields: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TableTab />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    const settingsButton = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID).querySelector('button');
    expect(settingsButton).not.toBeNull();
    await act(async () => {
      await userEvent.click(settingsButton as HTMLButtonElement);
    });

    expect(screen.getByTestId(TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID)).toBeChecked();
    expect(screen.getByTestId(TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID)).not.toBeChecked();
    expect(screen.getByTestId(TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID)).toBeChecked();
  });
});
