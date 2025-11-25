/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataViewPicker } from '.';
import { useDispatch } from 'react-redux';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock/test_providers';
import { useSelectDataView } from '../../hooks/use_select_data_view';
import { useUpdateUrlParam } from '../../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { PageScope } from '../../constants';

jest.mock('../../../common/utils/global_query_string', () => ({
  useUpdateUrlParam: jest.fn(),
}));

jest.mock('../../hooks/use_data_view');

jest.mock('../../hooks/use_select_data_view', () => ({
  useSelectDataView: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('react-redux', () => {
  return {
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn(),
  };
});

jest.mock('../../../common/lib/kibana');

jest.mock('@kbn/unified-search-plugin/public', () => ({
  ...jest.requireActual('@kbn/unified-search-plugin/public'),
  DataViewPicker: jest.fn((props) => (
    <div data-test-subj="dataViewManager">
      <button
        type="button"
        onClick={() => props.onChangeDataView('new-data-view-id')}
        data-test-subj="changeDataView"
      >
        {'Change Data View'}
      </button>
      <button
        type="button"
        onClick={() => props.onDataViewCreated()}
        data-test-subj="createDataView"
      >
        {'Create Data View'}
      </button>
      {props.onAddField && (
        <button type="button" onClick={() => props.onAddField()} data-test-subj="addField">
          {'Add Field'}
        </button>
      )}
      {props.onEditDataView && (
        <button type="button" onClick={() => props.onEditDataView()} data-test-subj="editDataView">
          {'Edit Data View'}
        </button>
      )}
      <div data-test-subj="currentDataViewId">{props.currentDataViewId}</div>
      <div data-test-subj="trigger">{props.trigger.label}</div>
    </div>
  )),
}));

describe('DataViewPicker', () => {
  let mockDispatch = jest.fn();

  beforeEach(() => {
    jest.mocked(useUpdateUrlParam).mockReturnValue(jest.fn());

    mockDispatch = jest.fn();

    jest.mocked(useDispatch).mockReturnValue(mockDispatch);

    jest.mocked(useKibana).mockReturnValue({
      services: {
        ...mockUseKibana().services,
        dataViewFieldEditor: { openEditor: jest.fn() },
        dataViewEditor: {
          userPermissions: { editDataView: jest.fn().mockReturnValue(true) },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the current data view ID', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    expect(screen.getByTestId('currentDataViewId')).toHaveTextContent('security-solution-default');
    expect(screen.getByTestId('trigger')).toHaveTextContent('Default Security Data View');
  });

  it('calls selectDataView when changing data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(jest.mocked(useSelectDataView())).toHaveBeenCalledWith({
      id: 'new-data-view-id',
      scope: 'default',
    });
  });

  it('calls useUpdateUrlParam when changing the default scoped data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(jest.mocked(useUpdateUrlParam(URL_PARAM_KEY.sourcerer))).toHaveBeenCalledWith({
      default: {
        id: 'new-data-view-id',
        selectedPatterns: [],
      },
    });
  });

  it('calls useUpdateUrlParam when changing the explore scoped data view', () => {
    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.explore} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('changeDataView'));

    expect(jest.mocked(useUpdateUrlParam(URL_PARAM_KEY.sourcerer))).toHaveBeenCalledWith({
      explore: {
        id: 'new-data-view-id',
        selectedPatterns: [],
      },
    });
  });

  it('opens field editor when adding a field', async () => {
    const mockFieldEditorClose = jest.fn();
    jest
      .mocked(useKibana().services.dataViewFieldEditor.openEditor)
      .mockResolvedValue(mockFieldEditorClose);

    render(
      <TestProviders>
        <DataViewPicker scope={PageScope.default} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('addField'));

    await waitFor(() => {
      expect(jest.mocked(useKibana().services.data.dataViews.get)).toHaveBeenCalledWith(
        'security-solution-default'
      );
      expect(jest.mocked(useKibana().services.dataViewFieldEditor.openEditor)).toHaveBeenCalled();
    });
  });

  describe('when user does not have editDataView permission', () => {
    it('does not render edit data view button', () => {
      jest
        .mocked(useKibana().services.dataViewEditor.userPermissions.editDataView)
        .mockReturnValue(false);

      render(
        <TestProviders>
          <DataViewPicker scope={PageScope.default} />
        </TestProviders>
      );

      expect(screen.queryByTestId('editDataView')).not.toBeInTheDocument();
    });

    it('does not render add field button', () => {
      jest
        .mocked(useKibana().services.dataViewEditor.userPermissions.editDataView)
        .mockReturnValue(false);

      render(
        <TestProviders>
          <DataViewPicker scope={PageScope.default} />
        </TestProviders>
      );

      expect(screen.queryByTestId('addField')).not.toBeInTheDocument();
    });
  });
});
